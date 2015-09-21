Package.describe({
  name: 'raix:rssfeed',
  version: '0.0.5',
  summary: 'Adds basic support for rss feed v2.0'
});

Package.on_use(function (api) {
    
  api.versionsFrom('1.0');

  api.use('webapp', 'server');
  api.add_files('rss.server.js', 'server');

  api.export('RssFeed');

});
