const request = require('supertest');
jest.mock('../ai');
const ai = require('../ai');

process.env.NODE_ENV = 'test';

describe('Wizard AI endpoints', () => {
  let app;
  beforeAll(() => {
    // mock AI functions
    ai.suggestUsersNeeds = jest.fn(async (context) => ({ users: ['Customer'], needs: [{ name: 'Order status', forUser: 'Customer' }] }));
    ai.suggestCapabilities = jest.fn(async (needs, context) => ({ capabilities: [{ name: 'Inventory API' }], links: [{ need: 'Order status', capability: 'Inventory API' }] }));
    ai.suggestEvolution = jest.fn(async (caps, context) => ([{ name: 'Inventory API', stage: 3, rationale: 'Productized API' }]));
    app = require('../app');
  });

  test('POST /ai/wizard/users-needs returns users and needs', async () => {
    const res = await request(app).post('/ai/wizard/users-needs').send({ context: 'Sell widgets to customers' });
    expect(res.statusCode).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.needs).toBeDefined();
  });

  test('POST /ai/wizard/capabilities returns capabilities and links', async () => {
    const res = await request(app).post('/ai/wizard/capabilities').send({ needs: [{ name: 'Order status', forUser: 'Customer' }], context: '' });
    expect(res.statusCode).toBe(200);
    expect(res.body.capabilities).toBeDefined();
    expect(res.body.links).toBeDefined();
  });

  test('POST /ai/wizard/evolution returns stages', async () => {
    const res = await request(app).post('/ai/wizard/evolution').send({ capabilities: [{ name: 'Inventory API' }], context: '' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].stage).toBe(3);
  });
});

