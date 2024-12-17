import { AuditError } from '../../middleware/error-handler/index.js';

/**
* Save audit change for deletion of paranoid instances. Only delete instances
* that are paranoid.
*
* @param {object} auditCtrl Instance of AuditCtrl
* @param {object} auditLog Audit log Sequelize instance
* @param {object} instance The Sequelize instance to track
* @param {object} transaction Sequelize transaction
 */
export default async({
  auditCtrl,
  auditLog,
  instance,
  transaction,
}) => {
  const models = auditCtrl.models;
  if (!auditLog) {
    throw new AuditError('Audit log is required');
  } else if (!instance) {
    throw new AuditError('Sequelize instance is required');
  } else if (!transaction) {
    throw new AuditError('Sequelize transaction is required');
  }

  if (models[instance.constructor.name].options.paranoid) {
    // Only destroy paranoid models. Deleting non-paranoid models must be done
    // manually.
    await instance.destroy({
      transaction,
    });

    const tableName = models[instance.constructor.name].tableName;
    const primaryKey = auditCtrl.getPrimaryKey(tableName);
    await models.Audit.Change.create({
      attribute: 'deleted_at',
      audit_log_uuid: auditLog.get('uuid'),
      key: instance.get(primaryKey),
      new_value: String(instance.get('deleted_at')),
      table: tableName,
    }, {
      transaction,
    });
  }
};
