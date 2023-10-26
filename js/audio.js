/**
 * Created by Michael on 31/12/13.
 */

var source;
var analyser;
var audioCtx = new (window.AudioContext || window.webkitAudioContext);

function start() {
	try {
		// Fix up for prefixing
		audioCtx = new (window.AudioContext || window.webkitAudioContext);
	}
	catch(e) {
		alert('Web Audio API is not supported in this browser');
	}
} 

var SoundCloudAudioSource = function(player) {
	var self = this;

	analyser = audioCtx.createAnalyser();
	analyser.fftSize = 2048;
	source = audioCtx.createMediaElementSource(player);
	source.connect(analyser);
	analyser.connect(audioCtx.destination);
 
	this.playStream = function(streamUrl) {
		// get the input stream from the audio element
		console.log('streamURL: ', streamUrl);
		player.addEventListener('ended', function(){
			self.directStream('coasting');
		});
		player.setAttribute('src', streamUrl);
		player.play();
	}
	
	if (!Detector.webgl) {
		Detector.addGetWebGLMessage();
	} else {
	  	var container = document.getElementById('container');
    	var globe = new Globe(container);

		globe.addData();
		globe.createPoints();
		globe.animate();
		document.body.style.backgroundImage = 'none'; // remove loading
	}
};

/**
 * Makes a request to the Soundcloud API and returns the JSON data.
 */
var SoundcloudLoader = function(player,uiUpdater) {
	var self = this;
	var client_id = "a0fc2925be56cb35a9d7aad0e866f423"; // to get an ID go to http://developers.soundcloud.com/
	this.sound = {};
	this.streamUrl = "";
	this.errorMessage = "";
	this.player = player;
	this.uiUpdater = uiUpdater;

	/**
	 * Loads the JSON stream data object from the URL of the track (as given in the location bar of the browser when browsing Soundcloud),
	 * and on success it calls the callback passed to it (for example, used to then send the stream_url to the audiosource object).
	 * @param track_url
	 * @param callback
	 */
	this.loadStream = function(track_url, successCallback, errorCallback) {
		SC.initialize({
			client_id: client_id
    });
    
		SC.resolve(track_url)
			.then(function(sound) {
				console.log('sound', sound);
				if(sound.kind=="playlist"){
					self.sound = sound;
					self.streamPlaylistIndex = 0;
					self.streamUrl = function() {
						return sound.tracks[self.streamPlaylistIndex].uri + '/stream?client_id=' + client_id;
					}
					successCallback();
				}else{
					self.sound = sound;
					self.streamUrl = function() { 
						return sound.uri + '/stream?client_id=' + client_id; 
					};
					successCallback();
				}
			})
			.catch(function(err) {
				self.errorMessage = '';
				self.errorMessage += err.message + '<br>';
				self.errorMessage += 'Make sure the URL has the correct format: https://soundcloud.com/user/title-of-the-track';
				console.log('error msg: ', self.errorMessage);
				errorCallback();
			});
	};

	this.directStream = function(direction){
		if(direction=='toggle'){
			if (this.player.paused) {
				this.player.play();
			} else {
				this.player.pause();
			}
		}
		else if(this.sound.kind=="playlist"){
			if(direction=='coasting') {
				this.streamPlaylistIndex++;
			}else if(direction=='forward') {
				if(this.streamPlaylistIndex>=this.sound.track_count-1) this.streamPlaylistIndex = 0;
				else this.streamPlaylistIndex++;
			}else{
				if(this.streamPlaylistIndex<=0) this.streamPlaylistIndex = this.sound.track_count-1;
				else this.streamPlaylistIndex--;
			}
			if(this.streamPlaylistIndex>=0 && this.streamPlaylistIndex<=this.sound.track_count-1) {
			   this.player.setAttribute('src',this.streamUrl());
			   this.uiUpdater.update(this);
			   this.player.play();
			}
		}
	}
};

/**
 * Class to update the UI when a new sound is loaded
 * @constructor
 */
var UiUpdater = function() {
	var controlPanel = document.getElementById('controlPanel');
	var trackInfoPanel = document.getElementById('trackInfoPanel');
	var infoImage = document.getElementById('infoImage');
	var infoArtist = document.getElementById('infoArtist');
	var infoTrack = document.getElementById('infoTrack');
	var messageBox = document.getElementById('messageBox');

	this.clearInfoPanel = function() {
		// first clear the current contents
		infoArtist.innerHTML = "";
		infoTrack.innerHTML = "";
		trackInfoPanel.className = 'hidden';
	};
	this.update = function(loader) {
		// update the track and artist into in the controlPanel
		var artistLink = document.createElement('a');
		artistLink.setAttribute('href', loader.sound.user.permalink_url);
		artistLink.innerHTML = loader.sound.user.username;
		var trackLink = document.createElement('a');
		trackLink.setAttribute('href', loader.sound.permalink_url);

		if(loader.sound.kind=="playlist"){
			trackLink.innerHTML = "<p>" + loader.sound.tracks[loader.streamPlaylistIndex].title + "</p>" + "<p>"+loader.sound.title+"</p>";
		}else{
			trackLink.innerHTML = loader.sound.title;
		}

		var image = loader.sound.artwork_url ? loader.sound.artwork_url : loader.sound.user.avatar_url; // if no track artwork exists, use the user's avatar.
		infoImage.setAttribute('src', image);

		infoArtist.innerHTML = '';
		infoArtist.appendChild(artistLink);

		infoTrack.innerHTML = '';
		infoTrack.appendChild(trackLink);

		// display the track info panel
		trackInfoPanel.className = '';

		// add a hash to the URL so it can be shared or saved
		var trackToken = loader.sound.permalink_url.substr(22);
		window.location = '#' + trackToken;
	};
	this.toggleControlPanel = function() {
		if (controlPanel.className.indexOf('hidden') === 0) {
			controlPanel.className = '';
		} else {
			controlPanel.className = 'hidden';
		}
	};
	this.displayMessage = function(title, message) {
		messageBox.innerHTML = ''; // reset the contents

		var titleElement = document.createElement('h3');
		titleElement.innerHTML = title;

		var messageElement = document.createElement('p');
		messageElement.innerHTML = message;

		var closeButton = document.createElement('a');
		closeButton.setAttribute('href', '#');
		closeButton.innerHTML = 'close';
		closeButton.addEventListener('click', function(e) {
			e.preventDefault();
			messageBox.className = 'hidden';
		});

		messageBox.className = '';
		// stick them into the container div
		messageBox.appendChild(titleElement);
		messageBox.appendChild(messageElement);
		messageBox.appendChild(closeButton);
	};
};

window.onload = function init() {

	start();

	var player =  document.getElementById('player');
	player.crossOrigin = 'anonymous';
	var uiUpdater = new UiUpdater();
	var loader = new SoundcloudLoader(player,uiUpdater);

	var audioSource = new SoundCloudAudioSource(player);
	var form = document.getElementById('form');
	var loadAndUpdate = function(trackUrl) {
		loader.loadStream(trackUrl,
			function() {
				uiUpdater.clearInfoPanel();
				audioSource.playStream(loader.streamUrl());
				uiUpdater.update(loader);
				setTimeout(uiUpdater.toggleControlPanel, 3000); // auto-hide the control panel
			},
			function() {
				uiUpdater.displayMessage("Error", loader.errorMessage);
			});
	};

	uiUpdater.toggleControlPanel();
	
	// on load, check to see if there is a track token in the URL, and if so, load that automatically
	if (window.location.hash) {
		var trackUrl = 'https://soundcloud.com/' + window.location.hash.substr(2);
		loadAndUpdate(trackUrl);
	}else{
		var trackUrl = 'https://soundcloud.com/youtellmelondon/phazz-lionheart';
		loadAndUpdate(trackUrl);
	}

	// handle the form submit event to load the new URL
	form.addEventListener('submit', function(e) {
		e.preventDefault();
		var trackUrl = document.getElementById('input').value;
		loadAndUpdate(trackUrl);
	});
	var toggleButton = document.getElementById('toggleButton')
	toggleButton.addEventListener('click', function(e) {
		e.preventDefault();
		uiUpdater.toggleControlPanel();
	});
	var aboutButton = document.getElementById('credit');
	aboutButton.addEventListener('click', function(e) {
		e.preventDefault();
		var message = document.getElementById('info').innerHTML;
		uiUpdater.displayMessage("About", message);
	});

	window.addEventListener("keydown", keyControls, false);
	 
	function keyControls(e) {
		switch(e.keyCode) {
			case 32:
				// spacebar pressed
				loader.directStream('toggle');
				break;
			case 37:
				// left key pressed
				loader.directStream('backward');
				break;
			case 39:
				// right key pressed
				loader.directStream('forward');
				break;
		}   
	}
};

function getAverageVolume(array) {
	var values = 0;
	var average;
 
	var length = array.length;
 
	// get all the frequency amplitudes
	for (var i = 0; i < length; i++) {
		values += array[i];
	}
 
	average = values / length;
	return average;
}
