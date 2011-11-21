// Flickr feed handler
var SampleApp = SampleApp || {};
SampleApp.Feeds = {};

// Base Feed Handler
SampleApp.Feeds.Base = Class.create({
    initialize: function(searchController) {
        this._searchController = searchController;
    },
    
    keywords: function() {
        return this._searchController.keywords();
    },
    
    appendScript: function(src) {
        var head = document.getElementsByTagName("head")[0],
            script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        head.appendChild(script);
    }
});

// Flickr feed handler
SampleApp.Feeds.Flickr = (function() {
    // register global Flickr feed handler
    window.jsonFlickrFeed = function(data) {
        console.log(data);
    };
    
    return Class.create(SampleApp.Feeds.Base, {
        updateFeed: function() {
            this.appendScript('http://api.flickr.com/services/feeds/photos_public.gne?tags=car&format=json');
        },
        
        resetFeed: function() {
            this._lastItemId = null;
        }
    });
})();

// Twitter feed handler
SampleApp.Feeds.Twitter = (function() {
    // register global Twitter feed handler
    window.jsonTwitterFeed = function(data) {
        console.log(data);
    };
    
    return Class.create(SampleApp.Feeds.Base, {
        updateFeed: function() {
            this.appendScript('http://search.twitter.com/search.json?q=car&callback=jsonTwitterFeed');
        },
        
        resetFeed: function() {
            
        }
    });
})();

// Search Controller
SampleApp.SearchController = Class.create({
    initialize: function() {
        this._feeds = [];
    },
    
    addFeed: function(feed) {
        this._feeds.push(new feed(this));
    },
    
    performSearch: function(keywords) {
        $.each(this._feeds, function() {
            this.updateFeed();
        });
    }
});

// Initialize the app
$(function() {
    var searchController = new SampleApp.SearchController();
    
    // add the feeds
    searchController.addFeed(SampleApp.Feeds.Flickr);
    searchController.addFeed(SampleApp.Feeds.Twitter);
    
    function triggerSearchEvent() {
        searchController.performSearch($('#search-input').val().split(/\s+/));
    }
    
    $('#search-input').bind('change', triggerSearchEvent);
});
