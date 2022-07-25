const { HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const nconf = require('nconf');
const Sequelize = require('sequelize');

const { AttachmentError } = require('../../middleware/error-handler');

/**
 * @param {object} attachmentCtrl Instance of AttachmentCtrl
 * @param {string} attachmentUuid
 * @param {string} auditApiCallUuid
 * @param {buffer} fileBody
 * @param {string} fileName
 */
module.exports = async({
  attachmentCtrl,
  attachmentUuid,
  auditApiCallUuid,
  fileBody,
  fileName,
}) => {
  const controllers = attachmentCtrl.parent;
  const models = attachmentCtrl.models;
  if (!attachmentUuid) {
    throw new AttachmentError('Attachment is required');
  } else if (!fileName) {
    throw new AttachmentError('File name is required');
  } else if (!fileBody) {
    throw new AttachmentError('File body is required');
  }

  const apiCall = await models.Audit.ApiCall.findOne({
    attributes: ['user_uuid', 'uuid'],
    where: {
      uuid: auditApiCallUuid,
    },
  });
  if (!apiCall || !apiCall.get('user_uuid')) {
    throw new AttachmentError('Missing audit API call');
  }

  const user = await models.User.findOne({
    attributes: ['household_uuid', 'uuid'],
    where: {
      uuid: apiCall.get('user_uuid'),
    },
  });
  if (!user) {
    throw new AttachmentError('Audit user does not exist');
  }

  const attachment = await models.Attachment.findOne({
    attributes: ['name', 'uuid'],
    include: [{
      as: 'Expense',
      attributes: ['uuid'],
      include: [{
        attributes: ['uuid'],
        include: [{
          attributes: ['uuid'],
          model: models.Category,
          required: true,
          where: {
            household_uuid: user.get('household_uuid'),
          },
        }],
        model: models.Subcategory,
        required: true,
      }],
      model: models.Expense,
      required: true,
    }],
    where: {
      uuid: attachmentUuid,
    },
  });
  if (!attachment) {
    throw new AttachmentError('Not found');
  }

  const fingerprintFileName = `${Date.now()}_${fileName}`;

  await controllers.AttachmentCtrl.s3Client.send(new PutObjectCommand({
    Bucket: nconf.get('AWS_STORAGE_BUCKET'),
    Key: fingerprintFileName,
    Body: fileBody,
  }));

  const headResponse = await controllers.AttachmentCtrl.s3Client.send(new HeadObjectCommand({
    Bucket: nconf.get('AWS_STORAGE_BUCKET'),
    Key: fingerprintFileName,
  }));

  attachment.set('aws_bucket', nconf.get('AWS_STORAGE_BUCKET'));
  attachment.set('aws_key', fingerprintFileName);
  attachment.set('aws_etag', headResponse.ETag);
  attachment.set('aws_content_length', headResponse.ContentLength);
  attachment.set('aws_content_type', headResponse.ContentType);

  await models.sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  }, async(transaction) => {
    await controllers.AuditCtrl.trackChanges({
      auditApiCallUuid,
      changeList: [attachment],
      transaction,
    });
  });
};
