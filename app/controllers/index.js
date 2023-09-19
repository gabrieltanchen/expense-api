const AttachmentCtrl = require('./attachment-ctrl');
const AuditCtrl = require('./audit-ctrl');
const BudgetCtrl = require('./budget-ctrl');
const CategoryCtrl = require('./category-ctrl');
const ExpenseCtrl = require('./expense-ctrl');
const FundCtrl = require('./fund-ctrl');
const HouseholdCtrl = require('./household-ctrl');
const IncomeCtrl = require('./income-ctrl');
const LoanCtrl = require('./loan-ctrl');
const UserCtrl = require('./user-ctrl');
const VendorCtrl = require('./vendor-ctrl');

class Controllers {
  constructor(models) {
    this.models = models;

    this.AttachmentCtrl = new AttachmentCtrl(this, models);
    this.AuditCtrl = new AuditCtrl(this, models);
    this.BudgetCtrl = new BudgetCtrl(this, models);
    this.CategoryCtrl = new CategoryCtrl(this, models);
    this.ExpenseCtrl = new ExpenseCtrl(this, models);
    this.FundCtrl = new FundCtrl(this, models);
    this.HouseholdCtrl = new HouseholdCtrl(this, models);
    this.IncomeCtrl = new IncomeCtrl(this, models);
    this.LoanCtrl = new LoanCtrl(this, models);
    this.UserCtrl = new UserCtrl(this, models);
    this.VendorCtrl = new VendorCtrl(this, models);
  }
}

module.exports = Controllers;
