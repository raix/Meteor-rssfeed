/*
 * meteor-rssfeed — This package publishes data as rss feeds, it takes params and listens on the url "/rss"
 */

// Polyfill
if(!Array.isArray) {
  Array.isArray = function (vArg) {
    return Object.prototype.toString.call(vArg) === '[object Array]';
  };
}

var url = Npm.require('url');

var feedHandlers = {};

var nameFollowsConventions = function(name) {
  // TODO: Expand check to follow URI name specs or test name to follow
  // Meteor.Collection naming convention
  return name === '' + name;
};

RssFeed = {
  publish: function(name, handlerFunction) {
    if (!nameFollowsConventions(name)) {
      throw new Error('RssFeed publish expects valid name to be of type String');
    }
    // Check if the handlerFunction is actually a function
    if (typeof handlerFunction !== 'function') {
      throw new Error('RssFeed publish expects feed handler as a function');
    }

    // Add the handler function to feedHandlers
    feedHandlers[name] = handlerFunction;
  },
  unpublish: function(name) {
    if (!nameFollowsConventions(name)) {
      throw new Error('RssFeed unpublish expects valid name to be of type String');
    }
    // We could do a check to se if the name is allready found, if not then
    // throw an error, but for now we are silent
    delete feedHandlers[name];
  },
  createTag: function(key, value) {
    if (typeof key === 'undefined') {
      return value;
    }

    return '<' + key + '>' + value + '</' + key + '>';
  },
  cdataValue: function(value) {
    return '<![CDATA[' + value + ']]>';
  },
  objectToXML: function(sourceObject) {
    // The returning string
    var result = '';

    // We do a one level iteration of the object
    for (var key in sourceObject) {
      if (sourceObject.hasOwnProperty(key)) {
        var value = sourceObject[key];
        // We create <key>value</key>
        if (typeof value === 'object') {
          // If date
          if (value instanceof Date) {
            // We extract the date into correct format
            // If Date we produce the formatted date Mon, 06 Sep 2009 16:20:00 +0000
            result += this.createTag(key, value.toUTCString());
          } else {
            if (Array.isArray(value)) {
              // If array we repeat the tag n times with values?
              for (var i = 0; i < value.length; i++) {
                result += this.createTag(key, this.objectToXML(value[i]));
              }
            } else {
              // If objects we do nothing - one could create nested xml?
              result += this.createTag(key, this.objectToXML(value));
            }
          }

        } else {
          if (typeof value === 'function') {
            // Should we execute the function and return the value into tag?
            value = value();
          }
          // But if text then incapsulate in <![CDATA[ ]]>
          result += this.createTag(key, value);
        }
      }
    }

    return result;
  }
};




// Handle the actual connection
WebApp.connectHandlers.use(function(req, res, next) {
  rssurl = /^\/rss\//gi;

  if (!rssurl.test(req.url)) {
    return next();
  }

  var parsed = url.parse(req.url, true);
  var folders = parsed.pathname.split('/');

  feedName = folders[2];

  // If feedHandler not found or somehow the feedhandler is not a function then
  // return a 404
  if (!feedHandlers[feedName] || typeof feedHandlers[feedName] !== 'function') {
    res.writeHead(404);
    res.end();
    return;
  }

  var self = {
    query: parsed.query,
    res: res
  };

  // Helper functions this scope
  Fiber = Npm.require('fibers');
  fileHandler = Fiber(function(self) {
    // We fetch feed data from feedHandler, the handler uses the this.addItem()
    // function to populate the feed, this way we have better check control and
    // better error handling + messages

    var feedObject = {
      channel: {
        title:'',
        description:'',
        link: '',
        lastBuildDate: '',
        pubDate: '',
        ttl: '',
        generator: 'Meteor RSS Feed',
        item: [] // title, description, link, guid, pubDate
      }
    };

    var feedScope = {
      cdata: RssFeed.cdataValue,
      setValue: function(key, value) {
        feedObject.channel[key] = value;
      },
      addItem: function(itemObject) {
        feedObject.channel.item.push(itemObject);
      }
    };

    feedHandlers[feedName].apply(feedScope, [self.query]);

    var feed = '<?xml version="1.0" encoding="UTF-8" ?>\n';
    feed += '<rss version="2.0">';
    feed += RssFeed.objectToXML(feedObject);
    feed += '</rss>';


    var feedBuffer = new Buffer(feed);

    self.res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    self.res.setHeader('Content-Length', feedBuffer.length);
    self.res.end(feedBuffer);

  });
  // Run feed handler
  try {
    fileHandler.run(self);
  } catch(err) {
    res.writeHead(404);
    res.end();
    throw new Error('Error in feed handler function, name ' + feedName + ' Error: ' + err.message);
  }

  return;
});
