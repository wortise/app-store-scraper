'use strict';

const request = require('request');
const throttled = require('throttled-request')(request);
const debug = require('debug')('app-store-scraper');
const c = require('./constants');

function clearPlatform (platform) {
  const offer = platform.offers?.find((offer) => offer.type === 'get');

  const price = offer?.price ?? 0;

  const screenshots = platform.customAttributes
    ?.default
    ?.default
    ?.customScreenshotsByType;

  return {
    appId: platform.bundleId,
    description: platform.description?.standard,
    icon: platform.artwork?.url,
    requiredOsVersion: platform.minimumOSVersion,
    released: platform.releaseDate,
    updated: platform.currentVersionReleaseDate || platform?.releaseDate,
    versionHistory: platform.versionHistory,
    version: platform.versionHistory?.[0].versionDisplay,
    price,
    currency: offer?.currencyCode,
    free: price === 0,
    screenshots,
    websiteUrl: platform.websiteUrl,
    privacyUrl: platform.privacyPolicyUrl,
    supportUrl: platform.supportURLForLanguage
  };
}

function cleanApp (app) {
  return {
    id: app.trackId,
    appId: app.bundleId,
    title: app.trackName,
    url: app.trackViewUrl,
    description: app.description,
    icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
    genres: app.genres,
    genreIds: app.genreIds,
    primaryGenre: app.primaryGenreName,
    primaryGenreId: app.primaryGenreId,
    contentRating: app.contentAdvisoryRating,
    languages: app.languageCodesISO2A,
    size: app.fileSizeBytes,
    requiredOsVersion: app.minimumOsVersion,
    released: app.releaseDate,
    updated: app.currentVersionReleaseDate || app.releaseDate,
    releaseNotes: app.releaseNotes,
    version: app.version,
    price: app.price,
    currency: app.currency,
    free: app.price === 0,
    developerId: app.artistId,
    developer: app.artistName,
    developerUrl: app.artistViewUrl,
    developerWebsite: app.sellerUrl,
    score: app.averageUserRating,
    reviews: app.userRatingCount,
    currentVersionScore: app.averageUserRatingForCurrentVersion,
    currentVersionReviews: app.userRatingCountForCurrentVersion,
    screenshots: app.screenshotUrls,
    ipadScreenshots: app.ipadScreenshotUrls,
    appletvScreenshots: app.appletvScreenshotUrls,
    supportedDevices: app.supportedDevices
  };
}

function cleanAppFromApi (app) {
  const { attributes, relationships } = app;

  const genres = relationships
    ?.genres
    ?.data;

  const developer = relationships
    ?.developer
    ?.data
    ?.[0];

  const primaryGenre = genres?.[0];

  const platforms = {};

  Object.entries(attributes.platformAttributes).forEach(([platform, attributes]) => {
    platforms[platform] = clearPlatform(attributes);
  });

  return {
    id: app.id,
    title: attributes.name,
    url: attributes.url,
    genres: genres?.map((genre) => genre.attributes?.name),
    genreIds: genres?.map((genre) => genre.id),
    primaryGenre: primaryGenre?.attributes?.name,
    primaryGenreId: primaryGenre?.id,
    contentRating: attributes.contentRatingsBySystem?.appsApple?.name,
    sizes: attributes.fileSizeByDevice,
    developerId: developer?.id,
    developer: attributes.artistName,
    developerUrl: developer?.attributes?.url,
    developerWebsite: attributes.sellerUrl,
    score: attributes.userRating?.value,
    reviews: attributes.userRating?.ratingCount,
    privacy: attributes.privacy,
    deviceFamilies: attributes.deviceFamilies,
    platforms
  };
}

// TODO add an optional parse function
const doRequest = (url, headers, requestOptions, limit) => new Promise(function (resolve, reject) {
  debug('Making request: %s %j %o', url, headers, requestOptions);

  requestOptions = Object.assign({ method: 'GET' }, requestOptions);

  let req = request;
  if (limit) {
    throttled.configure({
      requests: limit,
      milliseconds: 1000
    });
    req = throttled;
  }
  req(Object.assign({ url, headers }, requestOptions), (error, response, body) => {
    if (error) {
      debug('Request error', error);
      return reject(error);
    }
    if (response.statusCode >= 400) {
      return reject({ response });
    }
    debug('Finished request');
    resolve(body);
  });
});

const LOOKUP_URL = 'https://itunes.apple.com/lookup';

function lookup (ids, idField, country, lang, requestOptions, limit) {
  idField = idField || 'id';
  country = country || 'us';
  const langParam = lang ? `&lang=${lang}` : '';
  const joinedIds = ids.join(',');
  const url = `${LOOKUP_URL}?${idField}=${joinedIds}&country=${country}&entity=software${langParam}`;
  return doRequest(url, {}, requestOptions, limit)
    .then(JSON.parse)
    .then((res) => res.results.filter(function (app) {
      return typeof app.wrapperType === 'undefined' || app.wrapperType === 'software';
    }))
    .then((res) => res.map(cleanApp));
}

function storeId (countryCode) {
  const markets = c.markets;
  const defaultStore = '143441';
  return (countryCode && markets[countryCode.toUpperCase()]) || defaultStore;
}

function requestApi (id, country, params, requestOptions) {
  const tokenUrl = `https://apps.apple.com/${country}/app/id${id}`;
  return doRequest(tokenUrl, {}, requestOptions)
    .then((html) => {
      const regExp = /token%22%3A%22([^%]+)%22%7D/g;
      const match = regExp.exec(html);
      const token = match[1];

      const url = new URL(`https://amp-api.apps.apple.com/v1/catalog/${country}/apps/${id}`);
      url.searchParams.append('platform', 'web');

      if (params) {
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
      }

      return doRequest(url, {
        'Origin': 'https://apps.apple.com',
        'Authorization': `Bearer ${token}`
      }, requestOptions);
    })
    .then((json) => {
      if (json.length === 0) { throw Error('App not found (404)'); }

      return JSON.parse(json).data[0];
    });
}

function getIdFromBundleId (bundleId, country, lang, requestOptions, throttle) {
  return lookup([bundleId], 'bundleId', country, lang, requestOptions, throttle)
    .then((results) => {
      if (results.length === 0) {
        throw Error('App not found (404)');
      }
      return results[0].id;
    });
}

module.exports = {
  cleanApp,
  cleanAppFromApi,
  getIdFromBundleId,
  lookup,
  request: doRequest,
  requestApi,
  storeId
};
