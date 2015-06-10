// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
function fetchFacebookUserInfo() {
	console.log('Welcome!  Fetching your information.... ');
	var img;
	var userInfo = {};

	FB.api('/me/picture', function(response){
		if(!response) console.log('no response');
		else if (response.error) console.log(response.error);
		else{
			console.log('loding picture...' + response.data.url);
			// var mystatus = document.getElementById('picture');
			// mystatus.innerHTML = '<img class="profile-pic" src="' + response.data.url + '" />';
			userInfo.pictureUrl = response.data.url;

			FB.api('/me', function(response) {
				console.log('Successful login for: ' + response.name);

				var mystatus = document.getElementById('nom');
				mystatus.innerHTML = response.name;
				userInfo.name = response.name;
				return userInfo;
			});
		}
	});



	// document.getElementById('first-page').innerHTML = '<h1>Bienvenu à Khatmah.</h1>' +
	// '<p>Invite tes amis pour te joindre dans une Khatmah en cliquant sur le boutton ci-dessous.</p>' +
	// '<p><a class="btn btn-lg btn-primary" data-target="#myCarousel" data-slide-to="1" onclick="getFriends();">Commence Khatmah</a></p>';
}



// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
	console.log('statusChangeCallback');
	console.log(response);
	// The response object is returned with a status field that lets the
	// app know the current login status of the person.
	// Full docs on the response object can be found in the documentation
	// for FB.getLoginStatus().
	if (response.status === 'connected') {
		// Logged into your app and Facebook.
		//status: 'connected', authResponse: {accessToken: '...', expiresIn:'...', signedRequest:'...', userID:'...'}
		console.log('status response :' + response.authResponse.accessToken);
		$.post('/appConnected', {id: response.authResponse.userID,token: response.authResponse.accessToken, timeleft: response.authResponse.expiresIn}, function(response){
			$('#list-khatmahs').html(response);
		});
		$.post('/test', {data: response});
		testAPI();
	} else if (response.status === 'not_authorized') {
		// The person is logged into Facebook, but not your app.
		document.getElementById('first-page').innerHTML = '<h1>Bienvenu à Kahtmah<h1><p><code>Please log ' +
		'into this app.</code></p>' +
		'<a class="btn btn-lg btn-primary" onclick="FB.login(function(response){checkLoginState();console.log(\'Login into facebook...\');},{scope: \'public_profile,email,user_friends\'});checkLoginState();">Login</a>';
	} else {
		// The person is not logged into Facebook, so we're not sure if
		// they are logged into this app or not.
		console.log('not logged in');
		var content = document.getElementById('first-page').innerHTML;
		document.getElementById('first-page').innerHTML = '<h1>Bienvenu à Kahtmah<h1><p><code>Please log ' +
		'into Facebook.</code></p>' +
		'<a class="btn btn-lg btn-primary" onclick="FB.login(function(response){checkLoginState();console.log(\'authorizing the application...\');},{scope: \'public_profile,email,user_friends\'});checkLoginState();">Login</a>';
	}
}
//
// $(document).ready(function(){
// 	$('#list-khatmahs').on('click', '.kh-preview', function(){
// 		var r = loginStatus();
// 		$.post('/getKhatmah', {status: r, data: $(this).attr('k-id')}, function(response){
// 			$('#khatmah-container').html(response);
// 			console.log(response);
// 		});
// 	});
//
// 	$(document).on('click', '#Acc-k', function(){
// 		var r = loginStatus();
// 		$.post('/joinKhatmah', {status: r, data: $(this).closest('#mymenu').attr('ku-id')}, function(response){});
// 	});
//
// 	$(document).on('click', '#Quit-k', function(){
// 		var r = loginStatus();
// 		$.post('/quitgetKhatmah', {status: r, data: $(this).closest('#mymenu').attr('ku-id')}, function(response){});
// 	});
//
// 	$(document).on('click', '#Start-k', function(){
// 		var r = loginStatus();
// 		console.log($(this).closest('#mymenu').attr('ku-id'));
// 		$.post('/startKhatmah', {status: r, data: $(this).closest('#mymenu').attr('ku-id')}, function(response){});
// 	});
//
// 	$(document).on('click', '#Fini-k', function(){
// 		var r = loginStatus();
// 		$.post('/finishPart', {status: r, data: $(this).closest('#mymenu').attr('ku-id')}, function(response){});
// 	});
// });
//
//
// // This function is called when someone finishes with the Login
// // Button.  See the onlogin handler attached to it in the sample
// // code below.
// function checkLoginState() {
// 	FB.getLoginStatus(function(response) {
// 		statusChangeCallback(response);
// 	});
// }
//
//
//
// function getFriends(){
// 	$('#btn-2').html('');
// 	FB.login(function(response) {
// 		if (response.status === 'connected') {
// 			FB.api('/me/friends', function(response){
// 				console.log('response', response);
// 				var friends = response.data, l = friends.length;
// 				if(l == 0)
// 				{
// 					$('#friendssuggest').html('');
// 					$('#msg-2').html("aucun de vos amis utilise Khatmah, essayez de les invitez!");
// 					$('#btn-2').append('<span><a id="pre-2" class="btn btn-lg btn-primary" data-target="#myCarousel" data-slide-to="0" role="button"><span class="glyphicon glyphicon-chevron-left"/>Precedent</a></span>');
// 					$('#btn-2').append('&nbsp;<span><a id="btn-inviter" class="btn btn-lg btn-success" role="button"><span class="glyphicon glyphicon-plus"/>Inviter</a></span>');
// 					$('#btn-inviter').on('click',function(){
// 						inviter();
// 					});
// 					console.log('no friends');
// 				}
// 				else
// 				{
// 					$('#btn-2').append('<span><a id="pre-2" class="btn btn-lg btn-primary" data-target="#myCarousel" data-slide-to="0" role="button"><span class="glyphicon glyphicon-chevron-left"/>Precedent</a></span>');
// 					for(var i = 0; i<l; i++)
// 					{
// 						getPicture(friends, i, function(frds, j, img){
// 							frds[j].image = img;
// 							console.log('done' + j);
// 							if(j == frds.length - 1)
// 							{
// 								console.log('last one');
// 								$('#btn-2').append('<span><a id="btn-valid-select" class="btn btn-lg btn-primary" data-target="#myCarousel" data-slide-to="2" role="button">Valider</a></span>');
// 								fillSuggest(friends);
// 							}
// 						});
// 					}
// 				}
// 			});
// 		}
// 	}, {scope: 'user_friends'});
// }
//
// function getPicture(friends, i, fn){
// 	FB.api('/' + friends[i].id + '/picture', function(response){
// 		if(!response){console.log('no response for getting friend\'s picture of : ' + friends[i].id); fn(friends, i, 'img/default.png');}
// 		else if (response.error){console.log('error, getting friend\'s picture of : ' + friends[i].id); console.log(response.error); fn(friends, i, 'img/default.png');}
// 				else{
// 					console.log('loding friend\'s picture...' + response.data.url);
// 					fn(friends, i, response.data.url);
// 				}
// 	});
// }
//
// function fillSuggest(friends){
// 	console.log(friends);
// 	var tags = $('#friendssuggest').magicSuggest({
// 			renderer: function(data){
// 				return '<img width="25px" height="25px" class="i" src="' + data.image + '"/>' + data.name;
// 			},
// 			selectionRenderer: function(data){
// 				return '<img width="19px" height="19px" class="i" src="' + data.image + '"/> ' + data.name;
// 			},
// 			allowFreeEntries: false,
// 			data: friends,
// 			/*selectionPosition: 'bottom',
// 			selectionStacked: true,
// 			selectionRenderer: function(data){
// 			return data.name;
// 		}*/
// 	});
// 	console.log('tags', tags.getSelection());
// 	newKhatmah(tags.getSelection());
// 	$('#btn-valid-select').on('click', function(){
// 		newKhatmah(tags.getSelection());
// 	})
// }
//
// function newKhatmah(friends){
// 	var content = $('<div id="content-friends"></div>');
// 	if(friends.length == 0){
// 		content.append('<h1>aucun amis sélectioné!</h1>');
// 		content.append('<p><a class="btn btn-lg btn-primary" data-target="#myCarousel" data-slide-to="1" role="button"><span class="glyphicon glyphicon-chevron-left" />Precedent</a></p>');
// 	}
// 	else{
// 		var table = $('<table class="table table-striped"></table>');
// 		for(var i=0; i<friends.length; i++){
// 			var tr = $('<tr></tr>');
// 			tr.append('<td><img width="50px" height="50px" class="i" src="' + friends[i].image + '"/>&nbsp;' + friends[i].name + '</td>');
// 			table.append(tr);
// 		}
// 		content.append(table);
// 		var btn = $('<div></div>');
// 		btn.append('<span><a id="pre-3" class="btn btn-lg btn-primary" data-target="#myCarousel" data-slide-to="1" role="button"><span class="glyphicon glyphicon-chevron-left" />Precedent</a></span>');
// 		btn.append('&nbsp;<span><a id="btn-valid-last" class="btn btn-lg btn-success" role="button">Valider</a></span>');
// 		content.append(btn);
// 	}
//
// 	console.log('newKhatmah', content);
// 	$('#khatmah-container').html(content);
//
// 	$('#pre-3').on('click', function(){
// 		$('#khatmah-container').html('<img src="img/wait.gif" />');
// 	});
//
// 	$('#btn-valid-last').on('click', function(){
// 		$('#khatmah-container').html('<img src="img/wait.gif" />');
// 		var r = loginStatus();
// 		$.post('newKhatmah', {status: r, data: friends}, function(response){
// 			$('#khatmah-container').html(response);
// 		});
// 	});
// }
//
// function loginStatus(){
// 	var res = null;
// 	var flag = 0;
// 	FB.getLoginStatus(function(response){
// 		res = response;
// 		flag = 1;
// 	});
// 	while(flag == 0){}
// 	return res;
// }
//
// //invite friends
// function inviter(){
// 	FB.ui({method: 'apprequests',
// 	message: 'لنختم القرآن سوية.'
// }, function(response){
// 	console.log(response);
// });
// }
