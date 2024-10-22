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

