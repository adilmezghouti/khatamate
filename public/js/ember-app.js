App = Ember.Application.create({});

Ember.Application.initializer({
  name: "facebook",
  initialize: function(container, application) {

    window.fbAsyncInit = function() {
      var result = FB.init({
        appId: "699784623423562",
        status: true,
        xfbml: true,
        version: 'v2.2'
      });

      application.set('FB', window.FB);
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        return;
      }
      js = d.createElement(s);
      js.id = id;
      js.src = "//connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

  }
});

Ember.Application.initializer({
  name: "web-socket",
  initialize: function(container, application) {
    //Socket.io config
    application.set('io', io.connect());
  }
});


App.Router.map(function() {
  this.resource('login');
  this.resource('newKhatmah');
  this.resource('friends');
  this.resource('khatmah', {
    path: '/khatmah/:khatmah_id'
  });
  this.resource('khatm');
  this.resource('terms');
});

//Ember-Data config
App.ApplicationStore = DS.Store.extend({
  revision: 6,
  adapter: DS.RESTAdapter.extend()
});

App.User = DS.Model.extend({
  name: DS.attr('string'),
  _id: DS.attr('string'),
  url: DS.attr('string'),
  isCurrentUser: DS.attr('boolean'),
  token: DS.attr('string')
});

//Routes
App.Router.reopen({
  notifyGoogleAnalytics: function() {
    return ga('send', 'pageview', {
        'page': this.get('url'),
        'title': this.get('url')
      });
  }.on('didTransition')
});

App.MasterRoute = Ember.Route.extend({
  setupFacebook: function(self, callback) {
    var userInfo = {};

    FB.getLoginStatus(function(response) {
      console.log('login', response.status);
      if (response.status === 'connected') {
        // Logged into your app and Facebook.
        //status: 'connected', authResponse: {accessToken: '...', expiresIn:'...', signedRequest:'...', userID:'...'}

        FB.api('/me', function(userInfoResponse) {
          FB.api('/me/picture', function(pictureResponse) {
            $('#nom').text(userInfoResponse.name);
            $('#picture img').attr('src', pictureResponse.data.url);

            userInfo.id = response.authResponse.userID;
            userInfo.name = userInfoResponse.name;
            userInfo.url = pictureResponse.data.url;
            userInfo.token = response.authResponse.accessToken;

            //Store the user in Mongo and fetch the list of all the khatmahs the logged in user is involved in
            $.post('/appConnected', {
              user: userInfo
            }, function(connectionResponse) {
              //Store the user locally
              userInfo.isCurrentUser = true;
              userInfo._id = connectionResponse.currentUser._id;
              self.store.push('user', self.store.normalize('user', userInfo));

              callback(connectionResponse.khatmahs);

              //Store friends in mongo db
              FB.api('/me/friends', function(response) {
                $.post('/friends/new', {
                  'friends': response.data
                }, function(friendResponse) {
                  //Do nothing
                });
              });
            });
          });
        });
      } else if (response.status === 'not_authorized') {
        //TODO check if this is working
        self.transitionTo('login');
      } else {
        //TODO check if this is working
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
        console.log('not logged in');
        self.transitionTo('login');
      }
    }, {
      scope: 'public_profile,email,user_friends'
    });
  }
});

App.IndexRoute = App.MasterRoute.extend({
  model: function() {
    var model = Ember.Object.create({});
    var self = this;

    if (typeof FB !== 'undefined') {
      self.setupFacebook(self, function(khatmahs) {
        model.set('khatmahs', khatmahs);
      });
    }

    return model;
  },

  setupController: function(controller, model) {
    this._super(controller, model);
    var self = this;

    App.addObserver('FB', function() {
      model = Ember.Object.create({});
      self.setupFacebook(self, function(khatmahs) {
        model.set('khatmahs', khatmahs);
        controller.set('model', model);
      });

    });

    console.log('Model', model);
    //TODO add internationalization
    Ember.run.schedule('afterRender', this, function() {
      $().initWizard();
      $('#wizard-menu>li').removeClass('active');
      $('#join-khatmah').addClass('active');
    });
  }

});

App.FriendsRoute = App.MasterRoute.extend({
  model: function(params){
    var model = Ember.Object.create({});
    var self = this;

    if(typeof FB !== 'undefined') {
      self.setupFacebook(self, function(){
        self.fetchFriends(self, model);
      });
    }

    return model;
  },

  setupController: function(controller, model) {
    this._super(controller, model);
    var self = this;
    model = Ember.Object.create({});

    App.addObserver('FB', function() {
      self.setupFacebook(self, function() {
        self.fetchFriends(self, model, controller);
      });
    });

    Ember.run.schedule('afterRender', this, function() {
      $().initWizard();
      $('#friends').addClass('active');
      $('#wizard-menu>li').removeClass('active');
      $('#start-khatmah').addClass('active');
    });
  },

  fetchFriends: function(self, model, controller){
    FB.api('/me/friends', function(response) {
      var users = response.data;

      self.store.filter('user', function(user) {
        return user.get('isCurrentUser');
      }).then(function(filteredUsers) {
        if (filteredUsers.content.length > 0) {
          model.set('currentUser',filteredUsers.content[0]);
          $.post('/friends', {
            'friends': users,
            'owner': filteredUsers.content[0].id
          }, function(friendResponse) {
            model.set('friends',friendResponse.friends);
            if(typeof controller !== 'undefined') {
              controller.set('model', model);
            }
          });
        }
      });
    });
  }
});

App.KhatmahRoute = App.MasterRoute.extend({
  model: function(params) {
    var model = Ember.Object.create({});
    var self = this;

    if (typeof FB !== 'undefined') {
      self.setupFacebook(self, function() {});
    }

    return $.get('/khatmah/' + params.khatmah_id, function(response) {
      self.store.filter('user',function(user){
        return user.get('isCurrentUser');
      }).then(function(users){
        if(users.content.length > 0){
          self.get('model').set('currentUser', users.content[0]);
        }

        return response.khatmah;
      });
    });
  },

  setupController: function(controller, model) {
    this._super(controller, model);
    var self = this;

    App.addObserver('FB', function() {
      console.log('Observer', model);
      self.setupFacebook(self, function() {
        self.store.filter('user',function(user){
          return user.get('isCurrentUser');
        }).then(function(users){
          if(users.content.length > 0){
            var khatmah = model.khatmah;
            khatmah.currentUser = users.content[0];
            controller.set('model', khatmah);
          }
        })
      });
    });

    self.store.filter('user',function(user){
      return user.get('isCurrentUser');
    }).then(function(users){
      if(users.content.length > 0 && model){
        console.log(model,users.content[0]);
        model.currentUser = users.content[0];
        controller.set('model', model);
      }
    })

    Ember.run.schedule('afterRender', this, function() {
      $().initWizard();
      $('#wizard-menu>li').removeClass('active');
      $('#join-khatmah').addClass('active');
    });
  },

  serialize: function(model) {
    return {
      khatmah_id: model._id
    };
  }
});

App.TermsRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    this._super(controller, model);

    Ember.run.schedule('afterRender', this, function() {
      $().initWizard();
      $('#terms').addClass('active');
      $('#wizard-menu').hide();
    });
  }
});

//Controllers
App.ApplicationController = Ember.Controller.extend({
  actions: {
    joinKhatmah: function() {
      this.transitionToRoute('index');
    },

    startKhatmah: function() {
      this.transitionToRoute('friends');
    },

    showDashboard: function() {
      console.log('Showing dashboard...');
      this.transitionToRoute('khatm');
    }
  }
});

App.IndexController = Ember.Controller.extend({
  selectedUsers: [],
  selectedKhatmah: {},

  actions: {
    next: function() {
      var users_to_notify = [];
      var self = this;

      this.store.all('user').forEach(function(user) {
        users_to_notify.push(user.serialize({
          includeId: true
        }));
      });

      $.post("/user/new", {
          'users': users_to_notify
        },
        function(data) {
          self.transitionToRoute('khatmah');
        }).fail(function(err) {
        //TODO handle errors properly
        console.log(err);
      });

    },

    selectKhatmah: function(row, elementId) {
      $('#khatmah-table>tbody>tr').removeClass('success');
      $('#' + elementId).addClass('success');
      this.set('selectedKhatmah', row);
    },

    deleteKhatmah: function() {
      if (confirm("Vous allez annuler un Khatmah pour " +  this.get('selectedKhatmah.name')+ ". Voulez-vous continuer?")) {
        console.log('Deleting khatmah', this.get('selectedKhatmah._id'));
        this.get('model.khatmahs').removeObject(this.get('selectedKhatmah'));
        $.post('/khatmah/delete',{'id':this.get('selectedKhatmah._id')} , function(response){
          console.log('response', response);
        }).fail(function(error){
          //TODO handle the error properly
          console.log('Error', error);
        });
      }
    },

    joinKhatmah: function() {
      this.transitionToRoute('khatmah', this.get('selectedKhatmah'));
    }
  }
});

App.LoginController = Ember.Controller.extend({
  testAPI: function() {
    console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      console.log('Successful login for: ' + response.name);
      document.getElementById('status').innerHTML =
        'Thanks for logging in, ' + response.name + '!';
    });
  },

  actions: {
    loginToFacebook: function() {
      var self = this;
      console.log('logging in ...');


      FB.login(function(response) {
        console.log('login response', response);
        if (response.status === 'connected') {
          // Logged into your app and Facebook.
          self.transitionToRoute('index');
        } else if (response.status === 'not_authorized') {
          // The person is logged into Facebook, but not your app.
          self.transitionToRoute('login');
        } else {
          // The person is not logged into Facebook, so we're not sure if
          // they are logged into this app or not.
          self.transitionToRoute('login');
        }
      }, {
        scope: 'public_profile,email,user_friends'
      });
    }
  }
});

App.KhatmahController = Ember.Controller.extend({
  ahzabs: [2, 4, 6],
  selectedAhzab: [],

  setup: function() {
    console.log('Initting KhatmahController');
    var self = this;

    App.io.on('khatmah-status', function(data) {
      if (data != null) {
        var newModel = data.khatmah;
        newModel.currentUser = self.get('model.currentUser');
        self.set('model', newModel);
      }
    });
  }.on('init'),

  userStatusChanged: function() {
    if (this.get('model') && this.get('model.participants')) {
      var self = this;
      var status = this.get('model.participants').reduce(function(total, item) {
        return total + (item.status.toLowerCase() == 'done' ? 1 : 0);
      }, 0);

      if (status == 30) {
        console.log('Khatmah is done');
        $.post('/khatmah/' + this.get('model._id') + '/conclude', function(response) {
          self.transitionToRoute('khatm');
        }).fail(function(err) {
          console.log('err', err);
          //TODO handle error properly
        })
      } else {
        console.log('khatmah is not done yet', this.get('model'));
      }
    }
  }.observes('model.participants.@each.status'),

  updateUserStatus: function(participant, status) {
    var self = this;
    $.post('/khatmah/status', {
      'status': status,
      'participant_id': participant._id,
      'khatmah_id': self.get('model._id')
    }, function(response) {
      var newModel = response.khatmah;
      newModel.currentUser = self.get('model.currentUser');
      self.set('model', newModel);
    });
  },

  actions: {
    selectAhzabs: function(row, elementId) {
      if (this.get('selectedAhzab').contains(row._id)) {
        $('#' + elementId).removeClass('success');
        this.get('selectedAhzab').pop(row._id);
      } else {
        $('#' + elementId).addClass('success');
        this.get('selectedAhzab').push(row._id);
      }
    },

    markDone: function(participant) {
      console.log('marking the task as done');
      this.updateUserStatus(participant, 'DONE');
    },

    joinKhatmah: function(participant) {
      var self = this;

      this.store.filter('user', function(user) {
        return user.get('isCurrentUser');
      }).then(function(filteredUsers) {
        if (filteredUsers.content.length > 0) {
          $.post('/khatmah/join', {
            'khatmah_id': self.get('model._id'),
            'user_id': filteredUsers.content[0].id,
            'participant_id': participant._id
          }, function(response) {
            console.log('Response', response);
            var newModel = response.khatmah;
            newModel.currentUser = self.get('model.currentUser');
            self.set('model', newModel);
          });
        } else {
          //TODO display an error message
        }
      });
    }
  }
});

App.FriendsController = Ember.Controller.extend({
  selectedUsers: [],

  actions: {
    inviteFriend: function() {
      FB.ui({
        method: 'apprequests',
        message: 'لنختم القرآن سويا'
      }, function(response) {
        //TODO add it to the database.
        console.log(response);
      });
    },

    selectReciter: function(row, elementId) {
      var self = this;

      if (this.selectedUsers.contains(row.id)) {
        $('#' + elementId).removeClass('success');
        this.selectedUsers.pop(row.id);
        this.store.filter('user', function(user) {
          return user.id == row.id;
        }).then(function(filteredUsers) {
          console.log(filteredUsers.content[0]);
          self.store.unloadRecord(filteredUsers.content[0]);
        });
      } else {
        $('#' + elementId).addClass('success');
        this.selectedUsers.push(row.id);
        this.store.push('user', this.store.normalize('user', row));
      }
    }
  }
});

App.NewKhatmahController = Ember.ArrayController.extend({
  durations: [8, 12, 24, 36, 48],
  users: function() {
    return this.store.all('user');
  }.property(),
  khatmahs: [],

  actions: {
    startKhatmah: function() {
      var href = 'khatmah/';
      var template = '@[%@] voudrais vous inclure dans une khatmah au profit de %@';
      var access_token = '699784623423562|B3ePBdw9uUFsuifVvJgW2MErMJs';
      var users_to_notify = [];
      var owner = null;
      var self = this;

      this.store.all('user').forEach(function(user) {
        console.log('mongo id', user.get('_id'));
        users_to_notify.push(user.get('id'));
        if (user.get('isCurrentUser')) {
          console.log('Current user', user);
          owner = user;
        }
      });

      $.post('/startKhatmah', {
        'owner': owner.serialize({includeId: true}),
        'users': users_to_notify,
        'href': href,
        'template': template.fmt(owner.get('id'), self.get('khatmah_name')),
        'khatmah_name': self.get('khatmah_name'),
        'duration': self.get('duration')
      }, function(response) {
        self.transitionToRoute('index');
      }).fail(function(err) {
        //TODO handle error properly
        console.error(err);
      });
    }
  }
});


//------Views
App.QuranReadersListView = Ember.CollectionView.extend({
  tagName: 'tbody',
  classNames: ['loader'],
  itemViewClass: Ember.View.extend({ // extend! don't create!
    template: Ember.Handlebars.compile('<tr>' +
      '<td>{{view.content.user.name}}</td>' +
      '<td>{{view.content.user.url}}</td>' +
      '<td>{{view.content.ahzab}}</td>' +
      '<td><span class="label label-warning">{{statusLocalizer view.content.status}}</span>' +
      '</td>' +
      '<td><p {{bind-attr class="view.isTimeOver:text-danger:text-success"}}>{{view.timer}}</p></td>' +
      '<td>' +
      '{{#if view.isCurrentUserAndNotDone}}' +
      '   {{#if view.isOpen}}' +
      '     <input type="button" class="btn btn-next btn-fill btn-success btn-wd btn-sm" name="joinKhatmah" value={{i18n join}} {{action "joinKhatmah" view.content }} />' +
      '   {{else}}' +
      '     <input type="button" class="btn btn-next btn-fill btn-success btn-wd btn-sm" name="markDone" value={{i18n done}} {{action "markDone" view.content }} />' +
      '   {{/if}}' +
      '{{/if}}' +
      '</td>' +
      '</tr>'),


    click: function(evt) {
      // this.get('controller').send('selectAhzabs', this.content, this.elementId);
    },

    attributes: ['id'],

    id: function() {
      return this.content.id;
    }.property(),

    isOpen: function() {
      return this.content.status.toLowerCase() == 'open';
    }.property(),

    isTaken: function() {
      return this.content.status.toLowerCase() == 'taken';
    },

    isNotDone: function() {
      return this.content.status.toLowerCase() != 'done';
    },

    isCurrentUserAndNotDone: function() {
      return !this.content.user ||
        (this.get('controller.model.currentUser.id') &&
          this.content.user &&
          this.get('controller.model.currentUser.id') == this.content.user.id &&
          this.content.status.toLowerCase() != 'done');
    }.property(),

    isTimeOver: function(){
      return moment().subtract(this.get('controller.model.duration'),'h').isAfter(this.get('controller.model.date'));
    }.property(),

    timer: function() {
      return Math.abs(moment(this.get('controller.model.date')).diff(moment(),'h')) + ' ' + I18n.t('hours');
    }.property('time-minute'),

    didInsertElement: function() {
      this.tick();
    },

    tick: function() {
      var nextTick = Ember.run.later(this, function() {
        this.notifyPropertyChange('time-minute');
        this.tick();
      }, 60 * 1000); //every minute
      this.set('nextTick', nextTick);
    },

    willDestroyElement: function() {
      var nextTick = this.get('nextTick');
      Ember.run.cancel(nextTick);
    }

  })
});

App.KhatmahsListView = Ember.CollectionView.extend({
  tagName: 'tbody',
  classNames: ['loader'],
  itemViewClass: Ember.View.extend({ // extend! don't create!
    timer: "",
    template: Ember.Handlebars.compile('<tr>' +
      '<td>{{view.content.name}}</td>' +
      '<td>{{view.content.owner.name}}</td>' +
      '<td>{{view.availableSpots}}</td>' +
      '<td><span class="label label-warning">{{statusLocalizer view.content.status}}</span> <span class="badge">{{view.ahzabRead}}/60</span></td>' +
      '<td><p {{bind-attr class="view.isTimeOver:text-danger:text-success"}}>{{view.timer}}</p></td>' +
      '</tr>'),

    click: function(evt) {
      this.get('controller').send('selectKhatmah', this.content, this.elementId);
    },

    attributes: ['id'],

    id: function() {
      return this.content.id;
    }.property(),

    availableSpots: function() {
      var spots = this.content.participants.reduce(function(total, item) {
        return total + (item.status.toLowerCase() == 'open' ? 1 : 0);
      }, 0);

      return spots;
    }.property(),

    ahzabRead: function() {
      var sum = this.content.participants.reduce(function(total, item) {
        return total + (item.status.toLowerCase() == 'done' ? 2 : 0);
      }, 0);
      return (sum || 0);
    }.property(),

    isTimeOver: function(){
      return moment().subtract(this.content.duration,'h').isAfter(this.content.date);
    }.property(),

    timer: function() {
      return Math.abs(moment(this.content.date).diff(moment(),'h')) + ' ' + I18n.t('hours');
    }.property('time-minute'),

    didInsertElement: function() {
      this.tick();
    },

    tick: function() {
      var nextTick = Ember.run.later(this, function() {
        this.notifyPropertyChange('time-minute');
        this.tick();
      }, 60 * 1000); //every minute
      this.set('nextTick', nextTick);
    },

    willDestroyElement: function() {
      var nextTick = this.get('nextTick');
      Ember.run.cancel(nextTick);
    }

  })
});

App.FriendsListView = Ember.CollectionView.extend({
  tagName: 'tbody',
  classNames: ['loader'],
  itemViewClass: Ember.View.extend({ // extend! don't create!
    timer: "",
    template: Ember.Handlebars.compile('<tr>' +
      '<td>{{view.content.name}}</td>' +
      '<td><img {{bindAttr src=view.content.picture}}></img></td>' +
      '</tr>'),

    click: function(evt) {
      this.get('controller').send('selectReciter', this.content, this.elementId);
    },

    attributes: ['id'],

    id: function() {
      return this.content.id;
    }.property()

  })
});

//Helpers
Ember.Handlebars.helper('statusLocalizer', function(value,options){
  var status;
  I18n.locale = (navigator.language || navigator.browserLanguage).split('-')[0];
  
  if(value.toLowerCase() == 'open'){
    status = I18n.t('open');
  } else if(value.toLowerCase() == 'taken') {
    status = I18n.t('taken');
  } else {
    status = I18n.t('done');
  }

  return status;
});

Ember.Handlebars.registerHelper('i18n', function(property, options) {
  var params = options.hash,
      self = this;

  I18n.locale = (navigator.language || navigator.browserLanguage).split('-')[0];

  // Support variable interpolation for our string
  Object.keys(params).forEach(function (key) {
    params[key] = Em.Handlebars.get(self, params[key], options);
  });

  return I18n.t(property, params);
});
