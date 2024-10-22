'use strict';

const common = require('./common');

function privacy (opts) {
  opts.country = opts.country || 'US';

  return new Promise((resolve) => {
    if (opts.id) {
      resolve();
    } else {
      throw Error('Either id or appId is required');
    }
  })
    .then(() => {
      const params = {
        fields: 'privacyDetails'
      };
      return common.requestApi(opts.id, opts.country, params, opts.requestOptions);
    })
    .then((json) => {
      return json.attributes.privacyDetails;
    });
}

module.exports = privacy;

