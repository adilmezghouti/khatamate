var express = require('express');
var app = express();
var https = require('https');
var http = require('http');
var path = require('path');
var fs = require('fs');
var cheerio = require('cheerio');
var bodyParser = require('body-parser');
var FB = require('fb');
var async = require('async');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var favicon = require('serve-favicon');
var request = require('request');

mongoose.connect('mongodb://localhost/khatmah');

var options = {
  key: fs.readFileSync('khatmate.key'),
  cert: fs.readFileSync('www_khatamate_com.pem')
}

var httpsServer = https.Server(options, app);
var io = require('socket.io')(httpsServer);

http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);

io.on('connection', function(socket) {
  socket.emit('join', {
    connection: 'connected'
  });
});

//.....require models......//
// fs.readdirSync(__dirname + '/models').forEach(function(filename){
// 	if(~filename.indexOf('.js')){
// 		console.log('requiring js file :' + filename);
// 		require(__dirname + '/models/' + filename);
// 	}
// });
//.....end req models......//

//...requiring functions...//
// var fct = require('./functions');
//...requiring functions...//

// var User = mongoose.model('user');
// var Khatmah = mongoose.model('khatmah');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.ico')));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

//configure Mongoose models
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  picture: String,
  nbrOfKhatmatesFinished: Number,
  token: String,
  timeleft: String,
  lastup: Date,
  creation_date: {
    type: Date,
    default: Date.now
  }
});

UserSchema.plugin(uniqueValidator);
var User = mongoose.model('User', UserSchema);

var KhatmahSchema = new Schema({
  owner: {
    type: String,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: String,
  participants: [{
    'user': {
      type: String,
      ref: 'User'
    },
    status: String,
    ahzab: [Number]
  }],
  duration: Number //in hours
});

KhatmahSchema.plugin(uniqueValidator);
var Khatmah = mongoose.model('Khatmah', KhatmahSchema);

//------ End of Mongoose configuration

app.post('/appConnected', function(request, response) {
  var userInfo = request.body.user;

  //save this user to the DB if she does not exist already
  User.findOne({
    id: userInfo.id
  }, function(err, existingUser) {
    if (!existingUser) {
      var user = new User({
        'id': userInfo.id,
        'name': userInfo.name,
        'picture': userInfo.url,
        'nbrOfKhatmatesFinished': 0,
        'token': userInfo.token
      });
      user.save(function(err) {
        if (err) {
          console.log(err);
        } else {
          User.findOne({
            'id': userInfo.id
          }, function(err, user) {
            if (!err) {
              return response.status(200).json({
                'currentUser': user
              });
            } else {
              return response.status(405).json({
                'error': err
              });
            }
          });
        }
      });

    } else {
      User.update({
          id: userInfo.id
        }, {
          'name': userInfo.name,
          'picture': userInfo.url,
          'token': userInfo.token
        },
        function(err, numAffected, raw) {
          if (err) {
            console.log(err);
            return;
          }
        });

      //Return all the khatmahs
      Khatmah.find({
          'status': 'OPEN'
        })
        .populate('participants.user owner')
        .exec(function(err, khatmahList) {
          if (err) {
            return response.status(405).json({
              'error': err
            });
          } else {
            return response.status(200).json({
              'khatmahs': khatmahList,
              'currentUser': existingUser
            });
          }
        });
    }
  });


});

app.post('/user/new', function(request, response) {
  var users = request.body.users;
  var errors = [];

  for (var i = 0; i < users.length; i++) {
    var user = new User({
      'id': users[i].id,
      'name': users[i].name,
      'picture': users[i].picture,
      'nbrOfKhatmatesFinished': 0,
      'token': users[i].token
    });
    user.save(function(err) {
      if (err) {
        console.error(err);
        errors.push(err);
      }
    })
  }

  if (errors.length > 0) {
    return response.status(405).json({
      'error': err
    });
  } else {
    return response.status(200).json({});
  }
});

app.get('/khatmahs/:user_id', function(request, response) {
  Khatmah.find({
      'owner': request.params['user_id']
    })
    .populate(['participants.user', 'owner'])
    .exec(function(err, khatmahList) {
      if (err) {
        return response.status(405).json({
          'error': err
        });
      } else {
        return response.status(200).json({
          'khatmahs': khatmahList
        });
      }
    });

});

app.get('/khatmahs', function(request, response) {
  Khatmah.find({
    'status': 'OPEN'
    })
    .populate(['participants.user', 'owner'])
    .exec(function(err, khatmahList) {
      if (err) {
        return response.status(405).json({
          'error': err
        });
      } else {
        return response.status(200).json({
          'khatmahs': khatmahList
        });
      }
    });
});

app.get('/khatmah/:khatmah_id', function(request, response) {
  Khatmah.findOne({
      _id: new ObjectId(request.params['khatmah_id'])
    })
    .populate('participants.user')
    .exec(function(err, khatmah) {
      if (!err) {
        return response.status(200).json({
          'khatmah': khatmah
        });
      } else {
        return response.status(405).json({
          'error': err
        });
      }
    });
});

app.post('/khatmah/status', function(request, response) {
  var body = request.body;

  Khatmah.findOneAndUpdate({
      '_id': body.khatmah_id,
      'participants._id': body.participant_id
    }, {
      "$set": {
        "participants.$.status": body.status.toUpperCase()
      }
    }, {
      "new": true
    },
    function(err, doc) {
      if (err) {
        response.status(405).json({
          'error': err
        });
      } else {
        Khatmah.findOne({
            _id: new ObjectId(body.khatmah_id)
          })
          .populate('participants.user')
          .exec(function(err, khatmah) {
            if (!err) {
              io.emit('khatmah-status', {
                'khatmah': khatmah
              });

              return response.status(200).json({
                'khatmah': khatmah
              });
            } else {
              return response.status(405).json({
                'error': err
              });
            }
          });
      }
    });
});

app.post('/khatmah/join', function(request, response) {
  var body = request.body;

  User.findOne({
    id: body.user_id
  }, function(err, user) {
    Khatmah.where({
        '_id': body.khatmah_id,
        'participants._id': body.participant_id
      })
      .update({
          "$set": {
            "participants.$.status": 'TAKEN',
            "participants.$.user": user._id
          }
        },
        function(err, updateResponse) {
          Khatmah.findOne({
              _id: new ObjectId(body.khatmah_id)
            })
            .populate('participants.user')
            .exec(function(err, khatmah) {
              if (!err) {
                io.emit('khatmah-status', {
                  'khatmah': khatmah
                });
                return response.status(200).json({
                  'khatmah': khatmah
                });
              } else {
                return response.status(405).json({
                  'error': err
                });
              }
            });
        });
  });
});

app.post('/khatmah/:khatmah_id/conclude', function(request, response) {
  Khatmah.findOneAndUpdate({
    _id: request.params['khatmah_id']
  }, {
    status: 'DONE'
  }, function(err, doc) {
    if (!err) {
      Khatmah.findOne({
          _id: new ObjectId(request.params['khatmah_id'])
        })
        .populate('participants.user')
        .exec(function(err, khatmah) {
          if (!err) {
            // io.emit('khatmah-status', {
            //   'khatmah': khatmah
            // });
          }
        });

      response.status(200).json({});
    } else {
      response.status(200).json({
        'error': err
      });
    }
  })
});

app.get('/user/:id', function(request, response) {
  User.findOne({
    'id': request.params['id']
  }, function(err, user) {
    if (!err) {
      return response.status(200).json({
        'user': user
      });
    } else {
      return response.status(405).json({
        'error': err
      });
    }
  });
});

app.post('/friends', function(request, response) {
  var friends = request.body.friends;
  var friend_ids = [];

  friend_ids.push(request.body.owner);

  for (var i = 0; i < friends.length; i++) {
    friend_ids.push(friends[i].id);
  }

  User.where('id').in(friend_ids)
    .exec(function(err, users) {
      if (!err) {
        response.status(200).json({
          'friends': users
        });
      } else {
        response.status(405).json({
          'error': err
        });
      }
    })
});

app.post('/friends/new', function(request, response) {
  var friends = request.body.friends;
  var errors = [];

  for (var i = 0; i < friends.length; i++) {
    User.update({
        'name': friends[i].name
      }, {
        $set: {
          'picture': friends[i].url,
          'id': friends[i].id,
          'name': friends[i].name
        }
      }, {
        upsert: true
      },
      function(err, doc) {
        if (err) {
          errors.push(err);
        }
      })
  }

  if (errors.length > 0) {
    response.status(405).json({
      'error': errors
    });
  } else {
    response.status(200).json({});
  }

});

app.post('/startKhatmah', function(req, response) {
  var body = req.body;
  var users = body.users;
  var owner = body.owner;
  var participants = [];
  var ahzabCounter = 0;
  var app_token = '699784623423562|B3ePBdw9uUFsuifVvJgW2MErMJs';
  var api_uri;

  for (var i = 0; i < 30; i++) {
    participants.push({
      status: 'OPEN',
      ahzab: [++ahzabCounter, ++ahzabCounter]
    });
  }

  var khatmah = new Khatmah({
    'owner': body.owner._id,
    'name': body.khatmah_name,
    'status': 'OPEN',
    'participants': participants,
    'duration': body.duration
  });

  khatmah.save(function(err) {
    if (err) {
      response.status(405).json({
        'error': err
      });
    } else {
      Khatmah.findById(khatmah, function (err, doc) {
        for(var i=0;i < users.length;i++){
          if(users[i] != owner.id){
            api_uri = 'https://graph.facebook.com/v2.3/' + users[i] + '/notifications?'
            + 'href=' + body.href + doc._id
            + '&template=' + body.template
            + '&access_token=' + app_token;

            request.post(api_uri, function (error, response, body) {
                if(error){
                  console.error(error);
                }
              }
            );
          }
        }
      });
      response.status(200).json({});
    }
  });
});

app.post('/khatmah/delete', function(request, response){
  console.log('Deleting', request.body.id);
  Khatmah.remove({_id: request.body.id}, function(err){
    if(!err){
      response.status(200).json({});
    } else {
      //handle error
      response.status(405).json({'error':err});
    }
  });
})



app.post('/*', function(req, res){
  res.sendfile('index.html');
});

httpsServer.listen(443, function() {
  console.log('https listening on port: 443');
});
