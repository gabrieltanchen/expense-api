const chai = require('chai');
const TestHelper = require('../../test-helper');

const assert = chai.assert;

describe('Unit:Model - Loan', function() {
  let models;
  const testHelper = new TestHelper();

  before('get models', async function() {
    this.timeout(30000);
    const app = await testHelper.getApp();
    models = app.get('models');
  });

  after('cleanup', async function() {
    await testHelper.cleanup();
  });

  it('should have the correct table name', function() {
    assert.strictEqual(models.Loan.getTableName(), 'loans');
  });

  it('should have the correct attributes', async function() {
    const attributes = await models.Loan.describe();

    assert.isOk(attributes);

    // uuid
    assert.isOk(attributes.uuid);
    assert.strictEqual(attributes.uuid.type, 'UUID');
    assert.isFalse(attributes.uuid.allowNull);
    assert.isNull(attributes.uuid.defaultValue);
    assert.isTrue(attributes.uuid.primaryKey);

    // created_at
    assert.isOk(attributes.created_at);
    assert.strictEqual(attributes.created_at.type, 'TIMESTAMP WITH TIME ZONE');
    assert.isFalse(attributes.created_at.allowNull);
    assert.isNull(attributes.created_at.defaultValue);
    assert.isFalse(attributes.created_at.primaryKey);

    // updated_at
    assert.isOk(attributes.updated_at);
    assert.strictEqual(attributes.updated_at.type, 'TIMESTAMP WITH TIME ZONE');
    assert.isFalse(attributes.updated_at.allowNull);
    assert.isNull(attributes.updated_at.defaultValue);
    assert.isFalse(attributes.updated_at.primaryKey);

    // deleted_at
    assert.isOk(attributes.deleted_at);
    assert.strictEqual(attributes.deleted_at.type, 'TIMESTAMP WITH TIME ZONE');
    assert.isTrue(attributes.deleted_at.allowNull);
    assert.isNull(attributes.deleted_at.defaultValue);
    assert.isFalse(attributes.deleted_at.primaryKey);

    // household_uuid
    assert.isOk(attributes.household_uuid);
    assert.strictEqual(attributes.household_uuid.type, 'UUID');
    assert.isFalse(attributes.household_uuid.allowNull);
    assert.isNull(attributes.household_uuid.defaultValue);
    assert.isFalse(attributes.household_uuid.primaryKey);

    // name
    assert.isOk(attributes.name);
    assert.strictEqual(attributes.name.type, 'CHARACTER VARYING(255)');
    assert.isFalse(attributes.name.allowNull);
    assert.isNull(attributes.name.defaultValue);
    assert.isFalse(attributes.name.primaryKey);

    // amount_cents
    assert.isOk(attributes.amount_cents);
    assert.strictEqual(attributes.amount_cents.type, 'INTEGER');
    assert.isFalse(attributes.amount_cents.allowNull);
    assert.isNull(attributes.amount_cents.defaultValue);
    assert.isFalse(attributes.amount_cents.primaryKey);

    // balance_cents
    assert.isOk(attributes.balance_cents);
    assert.strictEqual(attributes.balance_cents.type, 'INTEGER');
    assert.isFalse(attributes.balance_cents.allowNull);
    assert.isNull(attributes.balance_cents.defaultValue);
    assert.isFalse(attributes.balance_cents.primaryKey);

    assert.strictEqual(Object.keys(attributes).length, 8);
  });
});