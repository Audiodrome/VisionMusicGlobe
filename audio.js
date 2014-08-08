var url = 'Transcend(Dubvirus Remix).ogg';
var musicBuffer;
var sourceNode;
var splitter;
var analyser1, analyser2;
var javascriptNode;
window.addEventListener('load', start, false);


//start();

//update();


function start() {
	try {
		// Fix up for prefixing
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		context = new AudioContext();

		w = window.innerWidth;
		h = window.innerHeight;
	}
	catch(e) {
		alert('Web Audio API is not supported in this browser');
	}
}

function initAudioNodes(){
	
	//javascriptNode = context.createScriptProcessor(2048, 1, 1);
	//javascriptNode.connect (context.destination);

	analyser = context.createAnalyser();
	analyser.fftSize = 1024;

	sourceNode = context.createBufferSource();

	sourceNode.connect(analyser);
	analyser.connect(context.destination);
	//analyser2.connect(context.destination);

	sourceNode.connect (context.destination);
}

function loadMusic(url){
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	
	request.onload = function(){
		context.decodeAudioData(request.response, function(buffer){
			playMusic(buffer);
		}, onError);
	};
	request.send();
}

function playMusic(buffer){
	sourceNode.buffer = buffer;
	sourceNode.start(0);
}

function onError(e){
	console.log(e);
}

/*
javascriptNode.onaudioprocess = function () {

	var array = new Uint8Array (analyser.frequencyBinCount);
	analyser.getByteFrequencyData(array);

	canvasCtx.clearRect (0, 0, 1920, 720);

	canvasCtx.fillStyle = gradient;
	draw(array);
}
*/
/*
function update() {
	requestAnimationFrame(update);

	var array = new Uint8Array (analyser.frequencyBinCount);
	analyser.getByteFrequencyData(array);
	var average = getAverageVolume (array);

}
*/
function getAverageVolume(array, begin, end, divisor) {
	var values = 0;
	var average;
 
	//var length = array.length;
				// get all the frequency amplitudes
	for (var i = begin; i < end; i++) {
		values += array[i];
	}
 
	average = values / divisor;
	return average;
}

