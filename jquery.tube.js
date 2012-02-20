/*!
 * jquery.tube.js 0.0.1
 * Copyright (c) 2012 Sylvester Keil, Thomas Egger.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
 
(function ($, window, document, version, undefined) {
  'use strict';
  
  /** String Supplant from Douglas Crockford's Remedial JavaScript */
  if (!String.prototype.supplant) {
   String.prototype.supplant = function (o) {
     return this.replace(/\{([^{}]*)\}/g, function (a, b) {
       var r = o[b];
       return typeof r === 'string' || typeof r === 'number' ? r : a;
     });
   };
  }
  
  /** Array Remove - By John Resig (MIT Licensed) */
  Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  };
  
  
  /** A Simple Observer Pattern Implementation */
  
  var observable = function (observers) {
    
    // private observer list
    observers = observers || {};
    
    this.on = function (event, callback) {
      observers[event] = observers[event] || [];
    
      if ($.isFunction(callback)) {
        observers[event].push(callback);      
      }
    
      return this;
    };
    
    // registers a one-time event handler
    this.once = function (event, callback) {
      var self = this;
      
      return this.on(event, function () {
        self.off(event, callback);
        callback.apply(self, arguments);
      });
    };
    
    this.off = function (event, callback) {
      if (observers[event]) {
        var i, os = observers[event], matches = [];
      
        if (callback) {
          for (i = 0; i < os.length; ++i) {
            if (os[i] === callback) {
              matches.push(i);
            }
          }
        
          for (i = 0; i < matches; ++i) {
            os.remove(i);
          }
        
        }
        else {
          // remove all observers for the event
          observers[event] = [];
        }      
      }
    
      return this;
    };
    
    this.notify = function () {
      var self = this, args = Array.prototype.slice.apply(arguments), event = arguments[0];
      
      if (observers[event]) {
        $.each(observers[event], function () {
          if ($.isFunction(this)) {
            this.apply(self, args);
          }
        });
      }
    
      return this;
    };
    
    return this;
  };
  
  
  /** Video Constructor */
  
  var Video = function (properties) {
    this.statistics = {};
    this.thumbnails = [];
  
    if (properties) {
      $.extend(this, properties);
    }
  };
  
  Video.constants = {
    users: '//www.youtube.com/user/{name}'
  };
  
  Video.templates = {
    thumbnail: '<img src="{url}" title="{title}" />',
    title: '<h1>{title} ({duration})</h1>',
    author: '<a href="{author_url}">{author}</a>',
    description: '<p>{description}</p>',
    statistics: '<span class="statistics">{views} / {favorites}</span>',
    video: '<a href="#{id}" rel="{index}">{title}{thumbnail}{description}<p>{author} – {statistics}</p></a>'
  };
  
  
  /** Private Functions */
  
  var pad = function (number) {
    return ('0' + number).slice(-2);
  };
  
  
  /** Video Instance Methods */
  
  /** Parses a YouTube JSON element */
  Video.prototype.parse = function (json) {
    try {
      if (json.id) {
        this.id = json.id.$t.match(/\/([^\/]*)$/)[1];
      }
    
      if (json.author && $.isArray(json.author)) {
        this.author = { 
          name: json.author[0].name.$t,
          id: json.author[0].uri.$t.match(/\/([^\/]*)$/)[1]
        };
        this.author.url = Video.constants.users.supplant(this.author);
      }
      
      if (json.yt$statistics) {
        this.statistics.favorites = json.yt$statistics.favoriteCount;
        this.statistics.views = json.yt$statistics.viewCount;
      }
  
      if (json.title) {
        this.title = json.title.$t;
      }
      
      if (json.media$group) {
        var media = json.media$group;
  
        if (media.media$description) {
          this.description = media.media$description.$t;
        }
        
        if (media.yt$duration) {
          this.duration_in_seconds = parseInt(media.yt$duration.seconds, 10);
        }
        
        if (media.media$thumbnail && $.isArray(media.media$thumbnail)) {
          this.thumbnails = $.map(media.media$thumbnail, function (image) {
            return image; // width, height, url, time
          });
        } 
      }
    }
    catch (error) {
      console.log(error);
    }
    
    return this;
  };
  
  Video.prototype.seconds = function () {
    return (this.duration_in_seconds || 0) % 60;
  };
  
  Video.prototype.minutes = function () {
    return parseInt((this.duration_in_seconds || 0) / 60, 10) % 60;
  };
  
  Video.prototype.hours = function () {
    return parseInt((this.duration_in_seconds || 0) / 3600, 10);
  };
  
  /** Returns the duration as a formatted string */
  Video.prototype.duration = function () {
    if (!this.duration_in_seconds) {
      return '';
    }
    
    var h = this.hours(), m = this.minutes(), s = this.seconds();
    return (h ? [h, pad(m), pad(s)] : [m, pad(s)]).join(':');
  };
  
  /** Returns the image as a property hash (used by the templates) */
  Video.prototype.properties = function (index) {
    var thumb = this.thumbnails[1] || this.thumbnails[0];
    
    return {
      id: this.id,
      index: index,
      title: this.title,
      duration: this.duration(),
      description: this.description,
      author: this.author.name,
      author_url: this.author.url,
      views: this.statistics.views,
      favorites: this.statistics.favorites,
      url: thumb.url
    };
  };
  
  /** Returns the video as an HTML string */
  Video.prototype.render = function (templates, index) {
    var properties = this.properties(index);
    templates = templates || Video.templates;
    
    return templates.video.supplant({
      id: this.id,
      index: index,
      title: Video.templates.title.supplant(properties),
      thumbnail: Video.templates.thumbnail.supplant(properties),
      description: Video.templates.description.supplant(properties),
      author: Video.templates.author.supplant(properties),
      statistics: Video.templates.statistics.supplant(properties)
    });
  };
  
  
  
  
  /** Tube Constructor */
  
  var Tube = function (options) {
    var self = this;
  
    this.videos = [];
    this.options = $.extend({}, Tube.defaults, options);
    this.current = 0;
    this.player = new Player(this.player_options());
  
    this.options.templates = $.extend(Video.templates, this.options.templates || {});
  
    observable.apply(this);
  
    // Register Tube event handlers
    $.each(Tube.events, function (idx, event) {
      if (self.options.events[event]) {
        self.on(event, self.options.events[event]);
      }
    });
    
    // Register Player event proxies and handlers
    $.each(Player.events, function (idx, event) {
      
      self.player.on(event, $.proxy(self.notify, self, event));
      
      if (self.options.events[event]) {
        self.on(event, self.options.events[event]);
      }
    });
    
  };
  
  Tube.constants = {
    api: '//gdata.youtube.com/feeds/api/' 
  };
  
  Tube.defaults = {
    player: 'player',
    autoload: false, // load the player automatically?
    autoplay: false,
    start: 0,
    order: 'relevance', // 'published', 'rating', 'viewCount'
    author: false,
    hide: 2, // 0 = always visible, 1 = hide progress bar and controls, 2 = hide progress bar
    controls: 1,
    version: 2,
    format: 5,
    limit: 10,
    key: false,
    events: []
  };
  
  Tube.parameters = {
    'q': 'query',
    'max-results': 'limit',
    'key': 'key',
    'format': 'format',
    'orderby': 'order',
    'author': 'author',
    'version': 'v'
  };
  
  Tube.events = ['load', 'ready', 'stop'];
  
  
  /** Static Tube Functions */
  
  /*
   * Encodes a set of parameters. Returns the encoded parameters as a string.
   */
  Tube.serialize = function (parameters) {
    var string;
    
    switch (typeof parameters) {
      case 'string':
        string = encodeURI(parameters);
        break;
        
      case 'object':
        if (parameters === null) {
          string = '';
        }
        else {
          string = $.map(parameters, function (value, key) {
            if (value) {
              return [encodeURI(key), encodeURI(value)].join('=');
            }
          }).join('&');
        }
        break;
        
      default:
        string = '';
        break;
    }
    
    return string;
  };
  
  
  
  /** Tube Instance Methods */
  
  /*
   * Populates the tube object with data from YouTube. If function is passed
   * as an argument to this method, it will be called when the AJAX request
   * returns. The callback will be applied to the tube object and passed the
   * number of videos that were fetched (i.e., a zero value indicates failure
   * or no results).
   * 
   * Returns the tube object (non-blocking).
   */
  Tube.prototype.load = function (callback) {
      var self = this, success = 0;
  
      $.getJSON(this.request(), function (data) {
        success = data.feed.entry.length;
  
        self.videos = $.map(data.feed.entry, function(item) {
          return new Video().parse(item);
        });
        
        
        // TODO check if player already exists for the DOM target and reuse it
        
        if (success && (self.options.autoload || self.options.start)) {
          self.current = Math.min(self.videos.length - 1, Math.max(0, self.options.start - 1));
          self.player.load(self.videos[self.current]);
        }
  
        self.notify('load');
        
        if (callback && $.isFunction(callback)) {  
          callback.apply(self, [success]);
        }
        
        self.notify('ready');
      });
      
      return this;
  };
  
  /** Returns the tube's player options as a hash */
  Tube.prototype.player_options = function () {
    return {
      id: this.options.player,
      playerVars: $.extend({
        autoplay: this.options.autoplay,
        autohide: this.options.hide,
        controls: this.options.controls
      }, Player.defaults)
    };
  };
  
  /** Returns the tube's gdata parameters as a hash */
  Tube.prototype.parameters = function () {
    var self = this, parameters = {};
    
    $.each(Tube.parameters, function (key, value) {
      if (self.options[value]) {
        parameters[key] = self.options[value];
      }
    });
    
    parameters.alt      = 'json-in-script';
    parameters.callback = '?';
  
    return parameters;
  };
  
  /** Returns the tube's gdata request string */
  Tube.prototype.request = function (options) {
    var api = Tube.constants.api;
  
    $.extend(this.options, options || {});
  
    // distinguish between playlist selection and video query
    if (this.options.playlist) {
      api += 'playlists/' + this.options.playlist;
    }
    else {
      api += 'videos';
    }
    
    return [api, '?', Tube.serialize(this.parameters())].join('');
  };
  
  Tube.prototype.authenticate = function () {
    return this;
  };
  
  /*
   * Plays the video at the given index in the associated player.
   * If no index is given, resumes the current video.
   */
  Tube.prototype.play = function (index) {
    if ($.isNumeric(index)) {
      var k = index % this.videos.length;  
      this.current = (k < 0) ? this.videos.length - k : k;
  
      if (this.player && this.videos.length) {
        this.player.play(this.videos[this.current]);
      }
    }
    else {
      this.player.resume();
    }
    
    return this;
  };
  
  /** Pauses playback of the current player */
  Tube.prototype.pause = function (index) {
    if (this.player) {
      this.player.pause();
    }
    return this;
  };
  
  Tube.prototype.stop = function (index) {
    if (this.player) {
      this.player.stop();
      this.notify('stop');
    }
    return this;
  };
  
  /** Plays the next video. */
  Tube.prototype.next = function () {
    return this.advance(1).notify('next');
  };
  
  /** Plays the previous video. */
  Tube.prototype.previous = function () {
    return this.advance(-1).notify('previous');
  };
  
  Tube.prototype.advance = function (by) {  
    return this.play(this.current + (by || 1));
  };
  
  
  
  /** Returns the video as an HTML string */
  Tube.prototype.render = function () {
    var templates = this.options.templates;
    var elements = $.map(this.videos, function (video, index) {
      return '<li>' + video.render(templates, index) + '</li>';
    });
    
    return '<ol>' + elements.join('') + '</ol>';
  };
  
  
  /*
   * Player is a proxy for a YouTube player object. It will use YouTube's
   * iFrame API if available, or else fallback to the JavaScript API.
   */
  
  var Player = function (options) {
    var self = this;
    
    this.options = options;
    this.p = null;
  
    // Mix-in observer pattern
    observable.apply(this);
  
    // Handle YouTube's state change events and dispatch using our taxonomy
    this.on('state', function (name, event) {
      if (event) {
        switch (event.data) {
          case -1:
            this.notify('unstarted');
            break;
          case YT.PlayerState.ENDED:
            this.notify('end');
            break;
          case YT.PlayerState.PLAYING:
            this.notify('play');
            break;
          case YT.PlayerState.PAUSED:
            this.notify('pause');
            break;
          case YT.PlayerState.BUFFERING:
            this.notify('buffer');
            break;
          case YT.PlayerState.CUED:
            this.notify('cue');
            break;
  
          default:
          // ignore
        }
      }
    });
    
    // Store the player reference on load (for reuse)
    this.once('ready', function (event) {
      if (self.p) {
        $('#' + self.options.id).data('player', self.p);
      }
    });
    
  };
  
  Player.constants = {
    swfobject: '//ajax.googleapis.com/ajax/libs/swfobject/2.2/swfobject.js'
  };
  
  Player.defaults = {
    id: 'player',
    width: 640,
    height: 360,
    playerVars: {
      autohide: 2, // 0 = always visible, 1 = hide progress bar and controls, 2 = hide progress bar
      autoplay: 0,
      controls: 1,
      enablejsapi: 1,
      loop: 0
    }
  };
  
  Player.events = ['unstarted', 'end', 'play', 'cue', 'buffer', 'pause', 'error'];
  
  /** Instance Methods */
  
  Player.prototype.play = function (video) {
    if (!this.p) {
      return this.load(video);
    }
  
    if (video) {
      this.p.loadVideoById(video.id, 0, this.options.quality);    
    }
    else {
      this.p.playVideo();
    }
    
    return this;
  };
  
  Player.prototype.resume = function () {
    if (this.p) {
      this.p.playVideo();
    }
    return this;
  };
  
  Player.prototype.pause = function () {
    if (this.p) {
      this.p.pauseVideo();
    }
    return this;
  };
  
  Player.prototype.stop = function () {
    if (this.p) {
      this.p.stopVideo();
    }
    return this;
  };
  
  Player.prototype.clear = function () {
    if (this.p) {
      this.p.stopVideo();
      this.p.clearVideo();
    }
    return this;
  };
  
  
  
  
  Player.prototype.event_proxy_for = function (event) {
    return $.proxy(this.notify, this, event);
  };
  
  /** API Dependent Methods */
  
  // TODO change switch to improve testability
  
  if ($.isFunction(window.postMessage)) {
  
    // Use the iFrame API
    // https://code.google.com/apis/youtube/iframe_api_reference.html
    
    Player.api = 'iframe';
    Player.constants.api = '//www.youtube.com/player_api';
    
    Player.constants.events = {
      onReady: 'ready',
      onStateChange: 'state',
      onPlaybackQualityChange: 'quality',
      onError: 'error'
    };
    
    Player.load = function (callback) {
      if (typeof YT === 'undefined') {
        var tag = document.createElement('script');
      
        window.onYouTubePlayerAPIReady = function () {
          if ($.isFunction(callback)) {
            callback.call();
          }
        };
  
        tag.src = Player.constants.api;
        $('script:first').before(tag);
  
        return false;
      }
      
      if ($.isFunction(callback)) {
        setTimeout(callback, 0);
      }
  
      return true;
    };
    
    Player.prototype.load = function (video) {
      var self = this, options = $.extend({}, this.options, { videoId: video.id, events: {} }),
        dom = $('#' + options.id);
  
      Player.load(function () {
        try {
          
          // Check whether or not a Player instance already exists
          if (dom.data('player')) {
            
            // Extract the player reference
            self.p = dom.data('player');
          
            // Register event proxies
            $.each(Player.constants.events, function (key, value) {
              self.p.addEventListener(key, self.event_proxy_for(value));
            });
            
          }
          else {
            // Map YouTube native events to our own events
            $.each(Player.constants.events, function (key, value) {
              options.events[key] = self.event_proxy_for(value);
            });
  
            self.p = new YT.Player(options.id, options);
  
            // Store a player reference
            dom.data('player', self.p);
          }
          
        }
        catch (error) {
          // console.log('Failed to load YouTube player: ', error);
          dom.insert('Failed to load YouTube player: ' + error.toString());
        }
      });
  
      return this;
    };
  }
  else {
    
    // Use the JavaScript API
    // https://code.google.com/apis/youtube/js_api_reference.html
    // https://code.google.com/p/swfobject/
    
    Player.api = 'js';
    Player.constants.api = '//www.youtube.com/v/{video}?enablejsapi=1&playerapiid=ytplayer&version=3';
    
    Player.load = function (callback) {
      if (!swfobject) {
        var tag = document.createElement('script');
  
        $(tag).load(function () {
          if ($.isFunction(callback)) {
            callback.call();
          }     
        });
  
        tag.src = Player.constants.swfobject;
        $('script:first').before(tag);
    
        return false;
      }
      
      if ($.isFunction(callback)) {
        setTimeout(callback, 0);
      }     
  
      return true;
    };
    
    Player.prototype.load = function (video) {
      return this;
    };
    
  }
  
  
  
  
  // methods exposed by jquery function plugin
  var methods = {
    load: Player.load
  };
  
  
  // the jquery fn plugin
  $.fn.tube = function (args) {
    var element, options;
    
    if (this.length) {
      
      if (typeof args === 'string') {
        options = { query: args };
      }
      else {
        options = args;
      }
      
      element = this.first();
      element.data('tube', new Tube(options).load(function (success) {
        var tube = this, playlist = $(tube.render());
  
        // setup on-click handlers to play video
        $('a[rel]', playlist).click(function (event) {
          event.preventDefault();        
          tube.play($(this).attr('rel'));
        });
        
        element.append(playlist);
      }));
    }
    
    return this;
  };
  
  // a jquery function plugin
  $.tube = function (command) {
    var fn = methods[command];
    return $.isFunction(fn) ? fn.call() : fn;
  };
  
  $.tube.constants = Tube.constants;
  $.tube.defaults = Tube.defaults;
}(jQuery, window, window.document, '0.0.1'));
