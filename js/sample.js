// Flickr feed handler
var SampleApp = SampleApp || {};
SampleApp.Feeds = {};

// Base Feed Handler
SampleApp.Feeds.Base = Class.create({
    initialize: function(searchController) {
        this._searchController = searchController;
        this._enabled = true;
        this.reset();
    },
    
    reset: function() {
    },
    
    enable: function(enable) {
        this._enabled = !!enable;
    },
    
    keywords: function() {
        return this._searchController.keywords();
    },
    
    appendScript: function(src) {
        if (!this._enabled) {
            return;
        }
        var head = document.getElementsByTagName("head")[0],
            script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        head.appendChild(script);
    }
});

// Flickr feed handler
SampleApp.Feeds.Flickr = Class.create(SampleApp.Feeds.Base, {
    reset: function() {
        this._lastImageId = '';
    },
    
    update: function(update) {
        this._update = update;
        this.appendScript('http://api.flickr.com/services/feeds/photos_public.gne?tags=' + this.keywords().join(',') + '&format=json');
    },
    
    processResults: function(results) {
        if (Object.isArray(results.items) && results.items.length > 0) {
            $.each(results.items, function(index, result) {
                var imageId = result.link.match(/\/(\d+)\//)[1],
                    photographer = result.author.match(/^[^(]+\((.*)\)$/)[1],
                    date = new Date(result.published);
                if (imageId <= this._lastImageId) {
                    return;
                } else {
                    this._lastImageId = imageId;
                }
                this._searchController.addResult({
                    feed_id: imageId,
                    type: 'flickr',
                    title: result.title,
                    titleLink: result.link,
                    imageSource: result.media.m,
                    date: date,
                    time: date.format(),
                    description: '<p><a href="http://www.flickr.com/photos/' + result.author_id + '" target="_blank">' + photographer + '</a> posted a photo.</p>'
                }, this._update);
            }.bind(this));
        }
    },
    
    resetFeed: function() {
        this._lastItemId = null;
    }
});

// Twitter feed handler
SampleApp.Feeds.Twitter = Class.create(SampleApp.Feeds.Base, {
    reset: function() {
        this._lastMaxId = null;
    },
    
    update: function(update) {
        var url = 'http://search.twitter.com/search.json?q=' + this.keywords().join('%20') + '&callback=jsonTwitterFeed';
        this._update = update;
        if (this._lastMaxId) {
            url += '&since_id=' + this._lastMaxId;
        }
        this.appendScript(url);
    },

    processResults: function(results) {
        if (Object.isArray(results.results) && results.results.length > 0) {
            this._lastMaxId = results.max_id_str;
            $.each(results.results, function(index, result) {
                var date = new Date(result.created_at);
                this._searchController.addResult({
                    feed_id: result.id_str,
                    type: 'twitter',
                    title: result.from_user_name,
                    titleLink: 'http://twitter.com/' + result.from_user + '/status/' + result.id_str,
                    imageSource: result.profile_image_url,
                    date: date,
                    time: date.format(),
                    description: result.text
                }, this._update);
            }.bind(this));
        }
    },
    
    resetFeed: function() {
    }
});

// Search Controller
SampleApp.SearchController = Class.create({
    initialize: function() {
        this._feeds = [];
        this._feedTimer = null;
        this._feedInterval = null;
        this._feedItems = [];
        this._updateFeed = false;
        this._keywords = [];
    },

    addFeed: function(feed) {
        this._feeds.push(feed);
    },

    performSearch: function(keywords) {
        this._keywords = keywords;
        this.resetInterval();
        
        // reset data
        $('#feed').html('');
        this._feedItems = [];
        this.updateFeed();
        
        // refresh the feed
        this._updateFeed = true;
        this.refreshFeed();
        this._updateFeed = false;
    },
    
    keywords: function() {
        return this._keywords;
    },
    
    resetInterval: function() {
        if (this._feedInterval) {
            clearInterval(this._feedInterval);
        }
        this._feedInterval = setInterval(this.refreshFeed.bind(this), 15000);
    },
    
    addResult: function(data, update) {
        var rendered = SampleApp.Templates.Result.render(data);
        if (update) {
            this.insertResult(rendered, '' + (data.date.getTime() / 1000));
        } else {
            if (!this._feedTimer) {
                this._feedTimer = setTimeout(this.updateFeed.bind(this), 1);
            }
            this._feedItems.push({
                content: rendered,
                time: data.date.getTime() / 1000
            });
        }
    },
    
    insertResult: function(result, ts) {
        if (!$('#feed li').length) {
            $('#feed').prepend($(result).data('ts', ts));
        } else {
            var item = $(result).data('ts', ts),
                inserted = false;
            $('#feed li').each(function() {
                var itemTs = $(this).data('ts');
                if (itemTs <= ts) {
                    $(result).data('ts', ts).insertBefore(this);
                    inserted = true;
                    return false;
                }
            });
            if (!inserted) {
                $('#feed').prepend($(result).data('ts', ts));
            }
        }
    },
    
    refreshFeed: function() {
        $.each(this._feeds, function(index, feed) {
            if (this._updateFeed) {
                feed.reset();
            }
            feed.update(this._updateFeed);
        }.bind(this));
    },
    
    updateFeed: function() {
        var count = this._feedItems.length,
            label = 'There ' + (count === 1 ? 'is ' : 'are ') + count + ' new item' + (count === 1 ? '' : 's');
        $('#new-items-notice span.label').text(label);
        $('#new-items-notice')[count ? 'show' : 'hide']();
        this._feedTimer = null;
    },
    
    insertNewItems: function() {
        $.each(this._feedItems, function(index, item) {
            this.insertResult(item.content, item.time);
        }.bind(this));
        this._feedItems = [];
        this.updateFeed();
        this.resetInterval();
    }
});

// Feed Item Template
SampleApp.Templates = {};
SampleApp.Template = Class.create({
    initialize: function(tmpl) {
        // pre-parse template
        var regex = /#\{[^}]+\}/g,
            matches = tmpl.match(regex);
        this._strings = tmpl.split(regex);
        this._matches = [];
        $.each(matches, function(index, string) {
            this._matches.push(string.match(/^#\{([^\}]+)\}$/)[1].split('.'));
        }.bind(this));
    },
    
    render: function(data) {
        var result = this._strings[0];
        for (matchIndex = 0; matchIndex < this._matches.length; ++matchIndex) {
            result += this.valueForKey(this._matches[matchIndex], data) + this._strings[matchIndex + 1];
        }
        return result;
    },
    
    valueForKey: function(keyPath, data) {
        var value = null;
        $.each(keyPath, function(index, key) {
            if (typeof data === 'object' && data[key]) {
                value = data[key];
                data = data[key];
            } else {
                value = data = null;
            }
        });
        return value;
    }
});

SampleApp.Templates.Result = new SampleApp.Template(
    '<li id="feed-item-#{feed_id}" class="#{type}-feed">' +
        '<img src="#{imageSource}" >' +
        '<span class="time">#{time}</span>' +
        '<span class="label"><a href="#{titleLink}" target="_blank">#{title}</a></span>' +
        '<p class="content">#{description}</p>' +
    '</li>');

// Initialize the app
$(function() {
    var searchController = new SampleApp.SearchController(),
        flickrFeed = new SampleApp.Feeds.Flickr(searchController),
        twitterFeed = new SampleApp.Feeds.Twitter(searchController);
    
    // add the feeds
    searchController.addFeed(flickrFeed);
    searchController.addFeed(twitterFeed);
    
    // add global trackers
    window.jsonFlickrFeed = flickrFeed.processResults.bind(flickrFeed);
    window.jsonTwitterFeed = twitterFeed.processResults.bind(twitterFeed);
    
    function triggerSearchEvent() {
        searchController.performSearch($('#search-input').val().split(/\s+/));
    }
    
    // monitor checkboxes
    $('#twitter-checkbox').bind('change', function() {
        var checked = $(this).attr('checked');
        twitterFeed.enable(checked);
        $('#feed')[checked ? 'removeClass' : 'addClass']('disable-twitter');
    });
    $('#flickr-checkbox').bind('change', function() {
        var checked = $(this).attr('checked');
        flickrFeed.enable(checked);
        $('#feed')[checked ? 'removeClass' : 'addClass']('disable-flickr');
    });

    $('#search-input').bind('change', triggerSearchEvent);
    $('#new-items-notice').bind('click', function() {
        searchController.insertNewItems();
    });
});
