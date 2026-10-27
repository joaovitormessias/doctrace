import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.OPENAI_API_KEY ??= 'test-placeholder';
const { groundedResponse, selectRelevantChunks, NOT_FOUND } = await import('../dist/services/document-answer.service.js');
const { handleChat } = await import('../dist/controllers/chat.controller.js');
const { searchDocumentChunksWithPlan } = await import('../dist/services/vector.service.js');
const { openai } = await import('../dist/openai.js');
const { pool } = await import('../dist/db.js');
const classification = { intent: 'document_question', confidence: .9, reason: 'test' };
const chunk = (id, similarity = .8) => ({ id, similarity, document_name: `${id}.pdf`, page_number: null, content: 'Lucro líquido: R$ 1.234,00.' });
const plan = { searchType: 'hybrid', semanticQuery: 'lucro liquido', keywordQueries: ['lucro'], expectedAnswerType: 'money', reason: 'test' };

for (const [name, content] of [
  ['recusa explicita', { found: false, answer: 'qualquer texto', sourceIds: ['a'] }],
  ['resposta sem fonte', { found: true, answer: 'valor', sourceIds: [] }],
  ['fonte inventada', { found: true, answer: 'valor', sourceIds: ['a', 'inventada'] }],
  ['fonte com tipo errado', { found: true, answer: 'valor', sourceIds: [1] }],
  ['texto de recusa com found true', { found: true, answer: NOT_FOUND, sourceIds: ['a'] }],
]) test(name, () => {
  const result = groundedResponse(JSON.stringify(content), [chunk('a')], classification);
  assert.equal(result.answer, NOT_FOUND);
  assert.deepEqual(result.sources, []);
});

test('JSON invalido ou ausencia de resposta recusa sem fontes', () => {
  for (const content of ['not-json', null, 'null']) {
    assert.deepEqual(groundedResponse(content, [chunk('a')], classification).sources, []);
    assert.equal(groundedResponse(content, [chunk('a')], classification).answer, NOT_FOUND);
  }
});

test('devolve apenas fontes usadas e deduplica IDs', () => {
  const result = groundedResponse(JSON.stringify({ found: true, answer: 'R$ 1.234,00.', sourceIds: ['b', 'b'] }), [chunk('a'), chunk('b')], classification);
  assert.equal(result.answer, 'R$ 1.234,00.');
  assert.deepEqual(result.sources.map(s => s.documentName), ['b.pdf']);
});

test('filtro aplica minimo a cada trecho, independentemente da ordem', () => {
  assert.deepEqual(selectRelevantChunks([chunk('low', .1), chunk('ok', .6), chunk('nan', NaN), chunk('low2', .54)], .55).map(c => c.id), ['ok']);
});

test('busca lexical mede distancia real e usa termos literais parametrizados', async () => {
  mock.method(openai.embeddings, 'create', async () => ({ data: [{ embedding: [0, 1] }] }));
  let captured;
  mock.method(pool, 'query', async (sql, values) => { captured = { sql, values }; return { rows: [chunk('a', .4)] }; });
  try {
    const result = await searchDocumentChunksWithPlan({ ...plan, searchType: 'lexical', keywordQueries: ['50%_'] });
    assert.equal(result[0].similarity, .4);
    assert.ok(captured.sql.includes('1 - (embedding <=> $1::vector)'));
    assert.ok(captured.sql.includes('strpos'));
    assert.ok(captured.sql.includes('ORDER BY'));
    assert.deepEqual(captured.values, ['[0,1]', '50%_']);
  } finally { mock.restoreAll(); }
});

function responseRecorder() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('pergunta contabil geral consulta documentos e nao responde por conhecimento livre', async () => {
  let requests = 0;
  mock.method(openai.chat.completions, 'create', async () => ({ choices: [{ message: { content: JSON.stringify(++requests === 1
    ? { ...classification, intent: 'general_accounting' } : plan) } }] }));
  mock.method(openai.embeddings, 'create', async () => ({ data: [{ embedding: [0, 1] }] }));
  let queries = 0;
  mock.method(pool, 'query', async () => { queries++; return { rows: [] }; });
  try {
    const res = responseRecorder();
    await handleChat({ body: { question: 'O que é lucro presumido?' } }, res);
    assert.equal(queries, 1);
    assert.equal(requests, 2); // Classificacao + plano; sem chamada de resposta quando nao ha contexto.
    assert.equal(res.body.answer, NOT_FOUND);
    assert.deepEqual(res.body.sources, []);
  } finally { mock.restoreAll(); }
});

test('pergunta fora de escopo nao acessa documentos', async () => {
  mock.method(openai.chat.completions, 'create', async () => ({ choices: [{ message: { content: JSON.stringify({ ...classification, intent: 'out_of_scope' }) } }] }));
  mock.method(pool, 'query', async () => { throw new Error('Nao deve consultar banco'); });
  try {
    const res = responseRecorder();
    await handleChat({ body: { question: 'Qual placa de video comprar?' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.sources, []);
    assert.ok(res.body.answer.includes('so posso responder'));
  } finally { mock.restoreAll(); }
});

test('rejeita entradas invalidas antes de chamar IA', async () => {
  for (const body of [undefined, { question: {} }, { question: '' }, { question: 'a'.repeat(4001) }]) {
    const res = responseRecorder();
    await handleChat({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

const workflowPath = fs.readdirSync(new URL('../../n8n/', import.meta.url)).find(f => f.endsWith('.json'));
const workflow = JSON.parse(fs.readFileSync(new URL(`../../n8n/${workflowPath}`, import.meta.url), 'utf8'));
const chunkCode = workflow.nodes.find(n => n.name === 'Divide chunks').parameters.jsCode;
const executeChunks = text => new Function('$input', '$', chunkCode)(
  { all: () => [{ json: { text } }] },
  () => ({ all: () => [{ binary: { file: { fileName: 'teste.pdf' } } }] }),
);

test('ingestao preserva textos curtos e o nome real', () => {
  const output = executeChunks('Lucro: R$ 10,00.');
  assert.equal(output.length, 1);
  assert.equal(output[0].json.content, 'Lucro: R$ 10,00.');
  assert.equal(output[0].json.documentName, 'teste.pdf');
});

test('PDF sem texto causa erro em vez de sucesso vazio', () => {
  assert.throws(() => executeChunks('   '), /sem texto extraivel/);
});

test('chunks longos possuem sobreposicao sem perder o final', () => {
  const text = 'a'.repeat(2500);
  const result = executeChunks(text);
  assert.deepEqual(result.map(x => x.json.content.length), [1200, 1200, 500]);
});

test('expressao de embeddings envia conteudo real como objeto', () => {
  const expression = workflow.nodes.find(n => n.name === 'HTTP Request - openai').parameters.jsonBody;
  const body = new Function('$json', `return (${expression.slice(4, -2)})`)({ content: 'Texto real' });
  assert.deepEqual(body, { model: 'text-embedding-3-small', input: 'Texto real' });
});
