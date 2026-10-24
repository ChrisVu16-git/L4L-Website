import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

//Test-only credentials : never use real secrets in automated test
process.env.CLOUDINARY_URL ||= 'cloudinary://123456:test-secret@test-cloud';
process.env.JWT_SECRET ||= 'test-only-jwt-secret'

const {default:app} = await import('../app.js');

test('GET /api/health return healthy status', async () => {
    const response = await request(app).get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');

})

test('POST /api/uploads/image reject a request without a token', async() => {
    const response = await request(app).post('/api/uploads/image');

    assert.equal(response.status, 401);
    assert.match(response.body.message, /token/i)
})

test('POST /api/products reject product creation without a token', async()=> {
    const response = await request(app)
                                        .post('/api/product')
                                        .send({
        name : "Test figure",
        description : "Automated test",
        price : 20,
        category : "Figures",
        image : "https://res.cloudinary.com/demo/image/upload/test.webp",
        countInStock : 5,
    });

    assert.equal(response.status, 404)
})