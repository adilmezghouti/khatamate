//...........variables...........//
var mongoose = require('mongoose');
var fs = require('fs');
var cheerio = require('cheerio');
var FB = require('fb');
var async = require('async');

var user = mongoose.model('user');
var khatmah = mongoose.model('khatmah');
var khatmahUser = mongoose.model('khatmahUser');
//..............................//

//........tools functions........//
function indexsArray(length){
  var t = [];
  for(var i = 0; i < length; i++){
    t[i] = i;
  }
  return t;
}

function IVsArray(length, value){
  var t = [];
  for(var i = 0; i < length; i++){
    t[i] = {i: i, v: value};
  }
  return t;
}

function shuffle(array){
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m != 0) {
    // Pick a remaining element…
    i = ~~(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

function assignRest(array, number){
  var t = indexsArray(array.length);
  var j;
  for(var i = 0; i < number; i++){
    j = ~~(Math.random() * t.length);
    array[t[j]].v ++;
    t.splice(j, 1);
  }
  return array;
}
//..............................//

//..........functions..........//
function errorMsg(title, msg){
  var content = fs.readFileSync(__dirname + '/views/error.html', {encoding: 'utf8'});
  console.log(content);
  var $ = cheerio.load(content);
  $('#error-title').html(title);
  $('#error').append(msg);
  return $.html();
}

function classOf(status){
  if(status == 'invited')
    return 'default';
  else if(status == 'confirmed')
    return 'info';
  else if(status == 'inprogress')
    return 'primary';
  else if(status == 'finished')
    return 'success';
  else if(status == 'quitted')
    return 'danger';
  return '';
}

function htmlTable(t){
  var content = fs.readFileSync(__dirname + '/views/table.html', {encoding: 'utf8'});
  var $ = cheerio.load(content);
  for(var i = 0; i < t.length; i++){
    var tr = cheerio.load('<tr></tr>');
    tr('tr').append('<td><img width="25px" height="25px" src="' + t[i].image + '"/>&nbsp'+ t[i].name + '</td>');
    if(t[i].from != 0 && t[i].to != 0)
      tr('tr').append('<td>du Hizb ' + t[i].from + 'au ' + t[i].to + '</td>');
    //tr.append('<td></td>');//append progreesbar
    tr('tr').append('<td><span class="label label-' + classOf(t[i].status) + '">' + t[i].status + '</span></td>');

    $('#tbl-body').append(tr.html());
  }
  return $.html();
}

function generateToken(_appToken, c){
  var error = {title: '', content: ''};
  FB.api('oauth/access_token', {
    client_id: '699784623423562',
    client_secret: 'c46b1d8440f34eebd52ae90699299086',
    grant_type: 'client_credentials'
  }, function (res) {
    if(!res || res.error) {
      console.log('generateToken function ERROR! | 1');
      error.title = 'erreur inconnue!';
      error.content = 'veuillez actualiser l\'application.';
      console.log(!res ? 'error occurred' : res.error);
      c(error, null);
      return;
    }
    _appToken.access_token = res.access_token;
    c(null, res);
  });
}

function verifyToken(userId, userToken, appToken, c){
  var error = {title: '', content: ''};
  FB.api('debug_token', {input_token: userToken, access_token: appToken}, function (res) {
    if(!res || res.error) {
      console.log('verifyToken function ERROR! | 1');
      console.log(userId);
      console.log(userToken);
      console.log(appToken);
      console.log(!res ? 'error occurred' : res.error);
      error.title = 'erreur inconnue!';
      error.content = 'veuillez actualiser l\'application.';
      c(error, null);
      return;
    }
    if(res.data.app_id == '699784623423562' && res.data.is_valid == true && res.data.user_id == userId){
      c(null, res);
    }
    else{
      console.log('verifyToken function ERROR! | 2');
      error.title = 'erreur de connexion!';
      error.content = 'essayez d\'actualiser l\'application.';
      console.log('token non valide!!!');
      c(error, null);
    }
  });
}

function getFriends(userId, appToken, _friends, c){
  var error = {title: '', content: ''};
  FB.api('/' + userId +'/friends', {access_token: appToken}, function(res){
    if(!res || res.error) {
      console.log('getFriends function ERROR! | 1');
      error.title = 'erreur inconnue!';
      error.content = 'veuillez actualiser l\'application.';
      console.log(!res ? 'error occurred' : res.error);
      c(error, null);
      return;
    }
    _friends.data = res.data;
    c(null, res);
  });
}

function verifyFriends(userId, sentFriends, friends, c){
  var t = [], error = {title: '', content: ''};
  for(var i = 0; i < friends.length; i++)
    t[i] = friends[i].id;
  for(var i = 0; i < sentFriends.length; i++)
  {
    if(t.indexOf(sentFriends[i].id) == -1){
      console.log('verifyFriends function ERROR! | 1');
      console.log('error finding friend: ' + sentFriends[i] + ' for user: ' + userId);
      sentFriends.splice(i, 1);
      i--;
    }
  }
  if(sentFriends.length != 0)
    c(null, sentFriends);
  else{
    console.log('verifyFriends function ERROR! | 2');
    error.title = 'erreur inconnue!';
    error.content = 'veuillez actualiser l\'application.';
    c(error, null);
  }
}

function getProfilePublic(appToken, _ku, i, c){
  var t = [], error = {title: '', content: ''}, tmp = {};
  console.log('/' + _ku[i].user + '/picture');
  FB.api('/' + _ku[i].user, {access_token: appToken}, function (topres) {
    if(!topres || topres.error) {
      console.log('getProfilePublic function ERROR! | 1');
      console.log(!topres ? 'error occurred' : topres.error);
      error.title = 'erreur inconnue!';
      error.content = 'veuillez actualiser l\'application.';
      c(error, null);
      return;
    }
    FB.api('/' + _ku[i].user + '/picture', {redirect: false, access_token: appToken}, function (res) {
      if(!res || res.error) {
        console.log('getProfilePublic function ERROR! | 2');
        console.log(!res ? 'error occurred' : res.error);
        error.title = 'erreur inconnue!';
        error.content = 'veuillez actualiser l\'application.';
        c(res, null);
        return;
      }
      tmp = JSON.parse(JSON.stringify(_ku[i]));
      tmp.name = topres.name;
      tmp.image = res.data.url;
      _ku[i] = tmp;
      if(i == _ku.length - 1){
        console.log('last');
        c(null, _ku);
      }
    });
  });
}

function completeProfiles(userId, appToken, _ku, _kuReq, c){
  for(var i = 0; i < _ku.length; i++){
    console.log(i + '...');
    if(userId == _ku[i].user){
      _kuReq.data = _ku[i];
      _ku.splice(i, 1);
      i--;
      if(i == _ku.lenght -1){
        console.log('last and equal to req user');
        c(null, _kuReq);
      }
    }
    else{
      getProfilePublic(appToken, _ku, i, c);
    }
  }
}

function viewKhatmah(kuReq, ku, _html, c){
  _html.content = renderKhatmahHead(kuReq.user, kuReq);
  _html.content += htmlTable(ku);
  c(null, _html);
}

function createKhatmah(userId, friends, _html, c){
  var k, ku;
  k = addKhatmah(userId, 'created');
  addKhatmahUser(k._id, userId, '0', '0', 'confirmed');
  ku = {khatmah: k, user: userId, from: '0', to: '0', progress: '0', status: 'confirmed'};
  _html.content = renderKhatmahHead(userId, ku);
  for(var i = 0; i < friends.length; i++){
    addKhatmahUser(k._id, friends[i].id, '0', '0', 'invited');
    friends[i].from = '0';
    friends[i].to = '0';
    friends[i].status = 'invited';
    friends[i].progress = '0';
  }
  _html.content += htmlTable(friends);
  console.log(_html);
  c(null, k);
}

function getKhatmah(userId, k_id, _ku, c){
  var error = {title: '', content: ''};
  khatmahUser.find({khatmah: k_id}, function(err, kha){
    if(!err){
      if(kha.lenght != 0){
        khatmah.populate(kha, {path: 'khatmah'}, function(err, kha_usr){
          if(!err){
            _ku.data = kha_usr;
            c(null, kha_usr);
          }
          else{
            console.log('getKhatmah function ERROR! | 1');
            console.log(err);
            error.title = 'database error!';
            error.content = 'essayez d\'actualiser la page.';
            c(error, null);
          }
        })
      }
      else{
        c(null, 'empty');
      }
    }
    else{
      console.log('getKhatmah function ERROR! | 2');
      console.log(err);
      error.title = 'database error!';
      error.content = 'essayez d\'actualiser la page.';
      c(error, null);
    }
  });
}

function listKhatmahs(userId, _html, c){
  var error = {title: '', content: ''};
  var khatUser = mongoose.model('khatmahUser');
  var khatmah = mongoose.model('khatmah');
  khatUser.find({user: userId}, function(err, kha){
    if(!err){
      if(kha.length != 0){
        khatmah.populate(kha, {path: 'khatmah'}, function(err, users){
          if(!err){
            console.log('users', users);
            // _html.content = renderKhatmahs(userId, kha_usr);
            c(null, users);
          }
          else{
            console.log('listKhatmahs function ERROR! | 1');
            console.log(err);
            error.title = 'database error!';
            error.content = 'essayez d\'actualiser la page.';
            c(error, null);
          }
        });
      } else {
        console.log('empty');
        c(null, []);
      }
    }
    else{
      console.log('listKhatmahs function ERROR! | 2');
      console.log(err);
      error.title = 'database error!';
      error.content = 'essayez d\'actualiser la page.';
      console.log('error', error);
      c(error, null);
    }
  });
}

function getKhatmahUser(userId, ku_id, _ku_one, isOwner, c){
  var error = {title: '', content: ''};
  khatmahUser.findById(ku_id, function(err, kha_usr){
    console.log(kha_usr);
    if(!err){
      if(userId == kha_usr.user){
        _ku_one.k_id = kha_usr.khatmah;
        _ku_one.data = kha_usr;
        if(isOwner){
          khatmah.populate(kha_usr, {path: 'khatmah'}, function(err, kha){
            if(kha.khatmah.owner == userId){
              c(null, kha_usr);
            }
            else{
              console.log('getKhatmahUser function ERROR! | 1');
              console.log('user isn\'t the owner! | khatmah_user: ' + ku_id);
              error.title = 'erreur inconue!';
              error.content = 'essayez d\'actualiser la page.';
              c(error, null);
            }
          });
        }
        else{
          c(null, kha_usr);
        }
      }
      else{
        console.log('getKhatmahUser function ERROR! | 2');
        console.log('khatmah user and userId not matched!');
        error.title = 'erreur inconue!';
        error.content = 'essayez d\'actualiser la page.';
        c(error, null);
      }
    }
    else{
      console.log('getKhatmahUser function ERROR! | 3');
      console.log(err);
      error.title = 'database error!';
      error.content = 'essayez d\'actualiser la page.';
      c(error, null);
    }
  });
}

function assignParts(ku, c){
  var error = {title: '', content: ''};
  var l = ku.length, current = 1, from, to, kuTmp;
  var quotient = ~~(60 / l), reste = 60 % l;
  var parts = IVsArray(l, quotient);
  shuffle(parts);
  if(reste > 0) assignRest(parts, reste);
  for(var i = 0; i < l; i++){
    console.log('tchh:' + i);
    kuTmp = ku[parts[i].i];
    from = current;
    to = from + parts[i].v - 1;
    current = to + 1;
    partsCallback(i, l ,kuTmp, from, to, c);
  }
}

function partsCallback(i, l ,kuTmp, from, to, c){
  var error = {title: '', content: ''};
  khatmahUser.update({_id: kuTmp._id},{from: from.toString(), to: to.toString(), status: 'inprogress'}, function(err, numAffected, raw){
    if(!err){
      if(i == l - 1){
        khatmah.update({_id : kuTmp.khatmah._id}, {status: 'started'}, function(err, numAffected, raw){
          if(!err){
            c(null, 'done');
          }
          else{
            console.log('partsCallback function ERROR! | 1');
            console.log(err);
            error.title = 'database error!';
            error.content = 'essayez d\'actualiser la page.';
            c(error, null);
          }
        });
      }
    }
    else{
      console.log('partsCallback function ERROR! | 2');
      console.log(err);
      error.title = 'database error!';
      error.content = 'essayez d\'actualiser la page.';
      c(error, null);
    }
  });
}

function updateKuStatus(ku, mustBe, status, c){
  var error = {title: '', content: ''};
  console.log('updateKuStatus ku');
  console.log(ku);
  if(ku.status == mustBe || !mustBe){
    khatmahUser.update({_id: ku._id}, {status: status}, function(err, numAffected, raw){
      if(!err){
        c(null, 'done');
      }
      else{
        console.log('updateKuStatus function ERROR! | 1');
        console.log(err);
        error.title = 'database error!';
        error.content = 'essayez d\'actualiser la page.';
        c(error, null);
      }
    });
  }
  else{
    console.log('updateKuStatus function ERROR! | 2');
    if(ku.status != mustBe) console.log('status must be: ' + mustBe + ' to update to: ' + status);
    else console.log('something wrong in updateKuStatus function');
    error.title = 'erreur inconnue!';
    error.content = 'essayez d\'actualiser la page.';
    c(error, null);
  }
}

function renderKhatmahs(userId, k){
  var content = fs.readFileSync(__dirname + '/views/khatmah.html', {encoding: 'utf8'});
  var $ = cheerio.load('');
  for(var i = 0; i < k.length; i++){
    var khat = cheerio.load(content);
    if(userId == k[i].khatmah.owner){
      khat('.kh-preview').append('<span><h3>OWNER</h3></span>');
    }
    khat('.kh-preview').attr('k-id', k[i].khatmah._id);
    khat('.kh-preview').append('<span>' + k[i].progress + '</span>');
    khat('.kh-preview').append('<span class="label label-' + classOf(k[i].status) + '">' + k[i].status + '</span>');
    khat('.kh-preview').append(renderMenu(userId, k[i]));
    $.root().append(khat.html());
  }

  return $.html();
}

function renderKhatmahHead(userId, k){
  //var content = fs.readFileSync(__dirname + '/views/khatmah.html', {encoding: 'utf8'});
  var $ = cheerio.load('<div class="jumbotron"></div>');
  var khat = cheerio.load('');
  if(userId == k.khatmah.owner){
    khat.root().append('<span><h3>OWNER</h3></span>');
  }
  khat.root().append('<span>' + k.progress + '</span>');
  khat.root().append('<span class="label label-' + classOf(k.status) + '">' + k.status + '</span>');
  khat.root().append(renderMenu(userId, k));
  $('div').append(khat.html());
  return $.html();
}

function renderMenu(userId, k){
  var owner = '', joigned = '', menu;
  if(userId == k.khatmah.owner) owner = 'owner-';
  else{
    if(k.status == 'joigned') joigned = 'joigned';
  }
  if(k.status == 'finished')
    menu = fs.readFileSync(__dirname + '/views/finished.html', {encoding: 'utf8'});
  else
    menu = fs.readFileSync(__dirname + '/views/' + owner + '' + k.khatmah.status + '' + joigned + '.html', {encoding: 'utf8'});
  var $ = cheerio.load(menu);
  $('#mymenu').attr('ku-id', k._id);
  return $.html();
}

function addUser(id, token, timeleft){
  var d = Date.now();
  var u = new user({id:id, token:token, timeleft:timeleft, lastup: d})
  u.save(function(err){
    if(err) console.log(err);
  });
}

function addKhatmah(userId, status){
  var k = new khatmah({owner: userId, status: status});
  console.log(k);
  k.save(function(err){
    if(err){console.log(err);}
  });
  return k;
}

function addKhatmahUser(khatmahId, userId, from, to, status){
  var ku = new khatmahUser({khatmah: khatmahId, user: userId, from: from, to: to, status: status , progress: 0});
  ku.save(function(err){
    if(err) console.log(err);
  });
}

function test(data,c){
  if(data.indexOf('1') != -1)
    c(null, 'helllo');
  else
    c('error', null);
}

//............................//

//.......module export.......//
module.exports.test = test;
module.exports.indexsArray = indexsArray;
module.exports.IVsArray = IVsArray;
module.exports.shuffle = shuffle;
module.exports.assignRest = assignRest;
module.exports.errorMsg = errorMsg;
module.exports.generateToken = generateToken;
module.exports.verifyToken = verifyToken;
module.exports.getFriends = getFriends;
module.exports.verifyFriends = verifyFriends;
module.exports.getProfilePublic = getProfilePublic;
module.exports.completeProfiles = completeProfiles;
module.exports.viewKhatmah = viewKhatmah;
module.exports.createKhatmah = createKhatmah;
module.exports.getKhatmah = getKhatmah;
module.exports.listKhatmahs = listKhatmahs;
module.exports.getKhatmahUser = getKhatmahUser;
module.exports.assignParts = assignParts;
module.exports.updateKuStatus = updateKuStatus;
module.exports.renderKhatmahs = renderKhatmahs;
module.exports.renderKhatmahHead = renderKhatmahHead;
module.exports.renderMenu = renderMenu;
module.exports.addUser = addUser;
module.exports.addKhatmah = addKhatmah;
module.exports.addKhatmahUser = addKhatmahUser;
module.exports.htmlTable = htmlTable;
module.exports.classOf = classOf;
//..........................//
