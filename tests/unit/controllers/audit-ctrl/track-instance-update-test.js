const chai = require('chai');
const crypto = require('crypto');
const Sequelize = require('sequelize');
const _ = require('lodash');

const sampleData = require('../../../sample-data');
const TestHelper = require('../../../test-helper');
const { AuditError } = require('../../../../app/middleware/error-handler');

const assert = chai.assert;

const shouldTrackAttribute = ({
  attribute,
  auditChanges,
  key,
  newValue,
  oldValue,
  table,
}) => {
  const trackedAttr = _.find(auditChanges, (auditChange) => {
    return auditChange.get('table') === table
      && auditChange.get('attribute') === attribute
      && auditChange.get('key') === key;
  });
  assert.isOk(trackedAttr);
  assert.strictEqual(trackedAttr.get('old_value'), String(oldValue));
  assert.strictEqual(trackedAttr.get('new_value'), String(newValue));
};

describe('Unit:Controllers - AuditCtrl._trackInstanceUpdate', function() {
  let controllers;
  let models;
  const testHelper = new TestHelper();

  before('get app', async function() {
    this.timeout(30000);
    const app = await testHelper.getApp();
    controllers = app.get('controllers');
    models = app.get('models');
  });

  after('cleanup', async function() {
    await testHelper.cleanup();
  });

  afterEach('truncate tables', async function() {
    this.timeout(10000);
    await testHelper.truncateTables();
  });

  it('should reject without an audit log', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    household.set('name', sampleData.users.user2.lastName);
    try {
      await models.sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async(transaction) => {
        await controllers.AuditCtrl._trackInstanceUpdate(null, household, transaction);
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Audit log is required');
      assert.isTrue(err instanceof AuditError);
    }
  });

  it('should reject without an instance', async function() {
    try {
      const auditLog = await models.Audit.Log.create();
      await models.sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async(transaction) => {
        await controllers.AuditCtrl._trackInstanceUpdate(auditLog, null, transaction);
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Sequelize instance is required');
      assert.isTrue(err instanceof AuditError);
    }
  });

  it('should reject without a Sequelize transaction', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    household.set('name', sampleData.users.user2.lastName);
    try {
      const auditLog = await models.Audit.Log.create();
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, household, null);
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Sequelize transaction is required');
      assert.isTrue(err instanceof AuditError);
    }
  });

  it('should track all Attachment attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const vendor = await models.Vendor.create({
      household_uuid: household.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });
    const householdMember = await models.HouseholdMember.create({
      household_uuid: household.get('uuid'),
      name: sampleData.users.user1.firstName,
    });
    const expense = await models.Expense.create({
      amount_cents: sampleData.expenses.expense1.amount_cents,
      date: sampleData.expenses.expense1.date,
      description: sampleData.expenses.expense1.description,
      household_member_uuid: householdMember.get('uuid'),
      reimbursed_cents: sampleData.expenses.expense1.reimbursed_cents,
      subcategory_uuid: subcategory.get('uuid'),
      vendor_uuid: vendor.get('uuid'),
    });
    const attachment = await models.Attachment.create({
      entity_type: 'expense',
      entity_uuid: expense.get('uuid'),
      name: sampleData.attachments.attachment1.name,
    });
    attachment.set('aws_bucket', sampleData.attachments.attachment2.aws_bucket);
    attachment.set('aws_content_length', sampleData.attachments.attachment2.aws_content_length);
    attachment.set('aws_content_type', sampleData.attachments.attachment2.aws_content_type);
    attachment.set('aws_etag', sampleData.attachments.attachment2.aws_etag);
    attachment.set('aws_key', sampleData.attachments.attachment2.aws_key);
    attachment.set('name', sampleData.attachments.attachment2.name);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, attachment, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'aws_bucket',
      auditChanges,
      key: attachment.get('uuid'),
      newValue: sampleData.attachments.attachment2.aws_bucket,
      oldValue: null,
      table: 'attachments',
    });
    shouldTrackAttribute({
      attribute: 'aws_content_length',
      auditChanges,
      key: attachment.get('uuid'),
      newValue: sampleData.attachments.attachment2.aws_content_length,
      oldValue: null,
      table: 'attachments',
    });
    shouldTrackAttribute({
      attribute: 'aws_content_type',
      auditChanges,
      key: attachment.get('uuid'),
      newValue: sampleData.attachments.attachment2.aws_content_type,
      oldValue: null,
      table: 'attachments',
    });
    shouldTrackAttribute({
      attribute: 'aws_etag',
      auditChanges,
      key: attachment.get('uuid'),
      newValue: sampleData.attachments.attachment2.aws_etag,
      oldValue: null,
      table: 'attachments',
    });
    shouldTrackAttribute({
      attribute: 'aws_key',
      auditChanges,
      key: attachment.get('uuid'),
      newValue: sampleData.attachments.attachment2.aws_key,
      oldValue: null,
      table: 'attachments',
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: attachment.get('uuid'),
      newValue: sampleData.attachments.attachment2.name,
      oldValue: sampleData.attachments.attachment1.name,
      table: 'attachments',
    });
    assert.strictEqual(auditChanges.length, 6);
  });

  it('should track all Budget attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory1 = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const subcategory2 = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category3.name,
    });
    const budget = await models.Budget.create({
      amount_cents: sampleData.budgets.budget1.amount_cents,
      month: sampleData.budgets.budget1.month,
      notes: sampleData.budgets.budget1.notes,
      subcategory_uuid: subcategory1.get('uuid'),
      year: sampleData.budgets.budget1.year,
    });
    budget.set('amount_cents', sampleData.budgets.budget2.amount_cents);
    budget.set('month', sampleData.budgets.budget2.month);
    budget.set('notes', sampleData.budgets.budget2.notes);
    budget.set('subcategory_uuid', subcategory2.get('uuid'));
    budget.set('year', sampleData.budgets.budget2.year);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, budget, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'amount_cents',
      auditChanges,
      key: budget.get('uuid'),
      newValue: sampleData.budgets.budget2.amount_cents,
      oldValue: sampleData.budgets.budget1.amount_cents,
      table: 'budgets',
    });
    shouldTrackAttribute({
      attribute: 'month',
      auditChanges,
      key: budget.get('uuid'),
      newValue: sampleData.budgets.budget2.month,
      oldValue: sampleData.budgets.budget1.month,
      table: 'budgets',
    });
    shouldTrackAttribute({
      attribute: 'notes',
      auditChanges,
      key: budget.get('uuid'),
      newValue: sampleData.budgets.budget2.notes,
      oldValue: sampleData.budgets.budget1.notes,
      table: 'budgets',
    });
    shouldTrackAttribute({
      attribute: 'subcategory_uuid',
      auditChanges,
      key: budget.get('uuid'),
      newValue: subcategory2.get('uuid'),
      oldValue: subcategory1.get('uuid'),
      table: 'budgets',
    });
    shouldTrackAttribute({
      attribute: 'year',
      auditChanges,
      key: budget.get('uuid'),
      newValue: sampleData.budgets.budget2.year,
      oldValue: sampleData.budgets.budget1.year,
      table: 'budgets',
    });
    assert.strictEqual(auditChanges.length, 5);
  });

  it('should track all Category attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household1 = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const household2 = await models.Household.create({
      name: sampleData.users.user2.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household1.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    category.set('household_uuid', household2.get('uuid'));
    category.set('name', sampleData.categories.category2.name);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, category, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: category.get('uuid'),
      newValue: household2.get('uuid'),
      oldValue: household1.get('uuid'),
      table: 'categories',
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: category.get('uuid'),
      newValue: sampleData.categories.category2.name,
      oldValue: sampleData.categories.category1.name,
      table: 'categories',
    });
    assert.strictEqual(auditChanges.length, 2);
  });

  it('should track all Deposit attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const fund1 = await models.Fund.create({
      amount_cents: 0,
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const fund2 = await models.Fund.create({
      amount_cents: 0,
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const auditLog = await models.Audit.Log.create();
    const deposit = await models.Deposit.create({
      amount_cents: sampleData.expenses.expense1.amount_cents,
      date: sampleData.expenses.expense1.date,
      fund_uuid: fund1.get('uuid'),
    });
    deposit.set('amount_cents', sampleData.expenses.expense2.amount_cents);
    deposit.set('date', sampleData.expenses.expense2.date);
    deposit.set('fund_uuid', fund2.get('uuid'));

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, deposit, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'amount_cents',
      auditChanges,
      key: deposit.get('uuid'),
      newValue: sampleData.expenses.expense2.amount_cents,
      oldValue: sampleData.expenses.expense1.amount_cents,
      table: 'deposits',
    });
    shouldTrackAttribute({
      attribute: 'date',
      auditChanges,
      key: deposit.get('uuid'),
      newValue: sampleData.expenses.expense2.date,
      oldValue: sampleData.expenses.expense1.date,
      table: 'deposits',
    });
    shouldTrackAttribute({
      attribute: 'fund_uuid',
      auditChanges,
      key: deposit.get('uuid'),
      newValue: fund2.get('uuid'),
      oldValue: fund1.get('uuid'),
      table: 'deposits',
    });
    assert.strictEqual(auditChanges.length, 3);
  });

  it('should track all Expense attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory1 = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const subcategory2 = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category3.name,
    });
    const vendor1 = await models.Vendor.create({
      household_uuid: household.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });
    const vendor2 = await models.Vendor.create({
      household_uuid: household.get('uuid'),
      name: sampleData.vendors.vendor2.name,
    });
    const householdMember1 = await models.HouseholdMember.create({
      household_uuid: household.get('uuid'),
      name: sampleData.users.user1.firstName,
    });
    const householdMember2 = await models.HouseholdMember.create({
      household_uuid: household.get('uuid'),
      name: sampleData.users.user2.firstName,
    });
    const fund1 = await models.Fund.create({
      amount_cents: 0,
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const fund2 = await models.Fund.create({
      amount_cents: 0,
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category3.name,
    });
    const expense = await models.Expense.create({
      amount_cents: sampleData.expenses.expense1.amount_cents,
      date: sampleData.expenses.expense1.date,
      description: sampleData.expenses.expense1.description,
      fund_uuid: fund1.get('uuid'),
      household_member_uuid: householdMember1.get('uuid'),
      reimbursed_cents: sampleData.expenses.expense1.reimbursed_cents,
      subcategory_uuid: subcategory1.get('uuid'),
      vendor_uuid: vendor1.get('uuid'),
    });
    expense.set('amount_cents', sampleData.expenses.expense2.amount_cents);
    expense.set('date', sampleData.expenses.expense2.date);
    expense.set('description', sampleData.expenses.expense2.description);
    expense.set('fund_uuid', fund2.get('uuid'));
    expense.set('household_member_uuid', householdMember2.get('uuid'));
    expense.set('reimbursed_cents', sampleData.expenses.expense2.reimbursed_cents);
    expense.set('subcategory_uuid', subcategory2.get('uuid'));
    expense.set('vendor_uuid', vendor2.get('uuid'));

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, expense, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'amount_cents',
      auditChanges,
      key: expense.get('uuid'),
      newValue: sampleData.expenses.expense2.amount_cents,
      oldValue: sampleData.expenses.expense1.amount_cents,
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'date',
      auditChanges,
      key: expense.get('uuid'),
      newValue: sampleData.expenses.expense2.date,
      oldValue: sampleData.expenses.expense1.date,
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'description',
      auditChanges,
      key: expense.get('uuid'),
      newValue: sampleData.expenses.expense2.description,
      oldValue: sampleData.expenses.expense1.description,
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'fund_uuid',
      auditChanges,
      key: expense.get('uuid'),
      newValue: fund2.get('uuid'),
      oldValue: fund1.get('uuid'),
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'household_member_uuid',
      auditChanges,
      key: expense.get('uuid'),
      newValue: householdMember2.get('uuid'),
      oldValue: householdMember1.get('uuid'),
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'reimbursed_cents',
      auditChanges,
      key: expense.get('uuid'),
      newValue: sampleData.expenses.expense2.reimbursed_cents,
      oldValue: sampleData.expenses.expense1.reimbursed_cents,
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'subcategory_uuid',
      auditChanges,
      key: expense.get('uuid'),
      newValue: subcategory2.get('uuid'),
      oldValue: subcategory1.get('uuid'),
      table: 'expenses',
    });
    shouldTrackAttribute({
      attribute: 'vendor_uuid',
      auditChanges,
      key: expense.get('uuid'),
      newValue: vendor2.get('uuid'),
      oldValue: vendor1.get('uuid'),
      table: 'expenses',
    });
    assert.strictEqual(auditChanges.length, 8);
  });

  it('should track all Fund attributes', async function() {
    const household1 = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const household2 = await models.Household.create({
      name: sampleData.users.user2.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const fund = await models.Fund.create({
      balance_cents: sampleData.expenses.expense1.amount_cents,
      household_uuid: household1.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    fund.set('balance_cents', sampleData.expenses.expense2.amount_cents);
    fund.set('household_uuid', household2.get('uuid'));
    fund.set('name', sampleData.categories.category2.name);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, fund, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'balance_cents',
      auditChanges,
      key: fund.get('uuid'),
      newValue: sampleData.expenses.expense2.amount_cents,
      oldValue: sampleData.expenses.expense1.amount_cents,
      table: 'funds',
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: fund.get('uuid'),
      newValue: household2.get('uuid'),
      oldValue: household1.get('uuid'),
      table: 'funds',
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: fund.get('uuid'),
      newValue: sampleData.categories.category2.name,
      oldValue: sampleData.categories.category1.name,
      table: 'funds',
    });
    assert.strictEqual(auditChanges.length, 3);
  });

  it('should track all Household attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    household.set('name', sampleData.users.user2.lastName);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, household, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: household.get('uuid'),
      newValue: sampleData.users.user2.lastName,
      oldValue: sampleData.users.user1.lastName,
      table: 'households',
    });
    assert.strictEqual(auditChanges.length, 1);
  });

  it('should track all HouseholdMember attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household1 = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const household2 = await models.Household.create({
      name: sampleData.users.user2.lastName,
    });
    const householdMember = await models.HouseholdMember.create({
      household_uuid: household1.get('uuid'),
      name: sampleData.users.user1.firstName,
    });
    householdMember.set('household_uuid', household2.get('uuid'));
    householdMember.set('name', sampleData.users.user2.firstName);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, householdMember, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: householdMember.get('uuid'),
      newValue: household2.get('uuid'),
      oldValue: household1.get('uuid'),
      table: 'household_members',
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: householdMember.get('uuid'),
      newValue: sampleData.users.user2.firstName,
      oldValue: sampleData.users.user1.firstName,
      table: 'household_members',
    });
    assert.strictEqual(auditChanges.length, 2);
  });

  it('should track all Subcategory attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category1 = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const category2 = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category1.get('uuid'),
      name: sampleData.categories.category3.name,
    });
    subcategory.set('category_uuid', category2.get('uuid'));
    subcategory.set('name', sampleData.categories.category4.name);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, subcategory, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'category_uuid',
      auditChanges,
      key: subcategory.get('uuid'),
      newValue: category2.get('uuid'),
      oldValue: category1.get('uuid'),
      table: 'subcategories',
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: subcategory.get('uuid'),
      newValue: sampleData.categories.category4.name,
      oldValue: sampleData.categories.category3.name,
      table: 'subcategories',
    });
    assert.strictEqual(auditChanges.length, 2);
  });

  it('should track all User attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household1 = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const household2 = await models.Household.create({
      name: sampleData.users.user2.lastName,
    });
    const user = await models.User.create({
      email: sampleData.users.user1.email,
      first_name: sampleData.users.user1.firstName,
      household_uuid: household1.get('uuid'),
      last_name: sampleData.users.user1.lastName,
    });
    user.set('email', sampleData.users.user2.email);
    user.set('first_name', sampleData.users.user2.firstName);
    user.set('household_uuid', household2.get('uuid'));
    user.set('last_name', sampleData.users.user2.lastName);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, user, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'email',
      auditChanges,
      key: user.get('uuid'),
      newValue: sampleData.users.user2.email,
      oldValue: sampleData.users.user1.email,
      table: 'users',
    });
    shouldTrackAttribute({
      attribute: 'first_name',
      auditChanges,
      key: user.get('uuid'),
      newValue: sampleData.users.user2.firstName,
      oldValue: sampleData.users.user1.firstName,
      table: 'users',
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: user.get('uuid'),
      newValue: household2.get('uuid'),
      oldValue: household1.get('uuid'),
      table: 'users',
    });
    shouldTrackAttribute({
      attribute: 'last_name',
      auditChanges,
      key: user.get('uuid'),
      newValue: sampleData.users.user2.lastName,
      oldValue: sampleData.users.user1.lastName,
      table: 'users',
    });
    assert.strictEqual(auditChanges.length, 4);
  });

  it('should track all UserLogin attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const user = await models.User.create({
      email: sampleData.users.user1.email,
      first_name: sampleData.users.user1.firstName,
      household_uuid: household.get('uuid'),
      last_name: sampleData.users.user1.lastName,
    });
    const newH2 = crypto.randomBytes(96).toString('base64');
    const newS1 = crypto.randomBytes(48).toString('base64');
    const oldH2 = crypto.randomBytes(96).toString('base64');
    const oldS1 = crypto.randomBytes(48).toString('base64');
    const userLogin = await models.UserLogin.create({
      h2: oldH2,
      s1: oldS1,
      user_uuid: user.get('uuid'),
    });
    userLogin.set('h2', newH2);
    userLogin.set('s1', newS1);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, userLogin, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    assert.strictEqual(auditChanges.length, 0);
  });

  it('should track all Vendor attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household1 = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const household2 = await models.Household.create({
      name: sampleData.users.user2.lastName,
    });
    const vendor = await models.Vendor.create({
      household_uuid: household1.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });
    vendor.set('household_uuid', household2.get('uuid'));
    vendor.set('name', sampleData.vendors.vendor2.name);

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackInstanceUpdate(auditLog, vendor, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: vendor.get('uuid'),
      newValue: household2.get('uuid'),
      oldValue: household1.get('uuid'),
      table: 'vendors',
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: vendor.get('uuid'),
      newValue: sampleData.vendors.vendor2.name,
      oldValue: sampleData.vendors.vendor1.name,
      table: 'vendors',
    });
    assert.strictEqual(auditChanges.length, 2);
  });
});
