'use strict';

const common = require('./common');

function privacy (opts) {
  opts.country = opts.country || 'US';

  return new Promise(async (resolve) => {
    if (!opts.id && !opts.appId) {
      throw Error('Either id or appId is required');
    }

    if (!opts.id) {
      opts.id = await common.getIdFromBundleId(opts.appId, opts.country, opts.lang, opts.requestOptions, opts.throttle);
    }

    resolve();
  })
    .then(() => {
      const params = {
        additionalPlatforms: 'appletv,ipad,iphone,mac,realityDevice',
        extend: 'customPromotionalText,customScreenshotsByType,customVideoPreviewsByType,description,developerInfo,distributionKind,editorialVideo,fileSizeByDevice,messagesScreenshots,privacy,privacyPolicyUrl,requirementsByDeviceFamily,sellerInfo,supportURLForLanguage,versionHistory,websiteUrl,videoPreviewsByType',
        include: 'genres,developer,reviews'
      };
      return common.requestApi(opts.id, opts.country, params, opts.requestOptions);
    })
    .then((json) => {
      return common.cleanAppFromApi(json);
    });
}

module.exports = privacy;

