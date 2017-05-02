# raix:rssfeed

A package for serving data in RSS 2.0 XML format for Meteor

## What is it?

It serves published data mounted on `http://mysite.meteor.com/rss/name`

or with a querystring `http://mysite.meteor.com/rss/name?foo=latest`

## How?

Add the package
```
  meteor add raix:rssfeed
```

Publish a feed
```js
RssFeed.publish('name', function(query) {
  var self = this;
  
  // We got 3 helpers:
  // 1. self.setValue
  // 2. self.addItem
  // 3. self.cdata


  // query is the parsed querystring as an object
  // eg. foo=latest would be query.foo === 'latest'

  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  self.setValue('title', self.cdata('My news'));
  self.setValue('description', self.cdata('This is a live feed'));
  self.setValue('link', 'http://mysite.meteor.com');
  self.setValue('lastBuildDate', new Date());
  self.setValue('pubDate', new Date());
  self.setValue('ttl', 1);

  DocsCollection.find({}).forEach(function(doc) {
    self.addItem({
      title: doc.name,
      description: doc.text,
      link: 'http://mysite.com',
      pubDate: new Date()
    });
  });

});
```

## API
* RssFeed.publish: function(name, handlerFunction)
* RssFeed.unpublish: function(name)

### Internal
* RssFeed.createTag: function(key, value)
* RssFeed.cdataValue: function(value)
* RssFeed.objectToXML: function(sourceObject)

### 'this' in publish feed handler helpers
* this.cdata: RssFeed.cdataValue
* this.setValue: function(key, value)
* this.addItem: function(itemObject)
