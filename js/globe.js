var Globe = Globe || {};

Globe = function(container) { 
  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
          'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  var stats;

  var camera, scene, renderer, w, h;
  var mesh, atmosphere, point;

  var wedge = [];
  var points = [];

  var overRenderer;

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  var last = performance.now();

  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
    camera.position.z = distance;

    scene = new THREE.Scene();

    var geometry = new THREE.SphereGeometry(200, 40, 30);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].value = THREE.ImageUtils.loadTexture('world.jpg');

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    // scene.add(mesh);

    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set( 1.1, 1.1, 1.1 );
    // scene.add(mesh);

    geometry = new THREE.BoxGeometry(1.0, 1.0, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-0.5));

    point = new THREE.Mesh(geometry);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(w,h);
    renderer.setClearColor(0x000000, 0.5);

    renderer.domElement.style.position = 'absolute';

    stats = new Stats();
    stats.domElement.style.position = 'absolute';

    var widthTemp = w - 100;
    widthTemp = widthTemp.toString() + 'px';
    stats.domElement.style.right = '10px';
    stats.domElement.style.top = '0px';

    // document.body.appendChild( stats.domElement );
    container.appendChild( stats.domElement );

    container.appendChild(renderer.domElement);
    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);
    container.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);

    container.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);
  }

  function addData (){
    
    var lat, lng, size, i, color, step;
    step = 3;
    var citiesL = cities.length;
    
    for (i = 0; i < 360; i++){
      wedge[i] = new THREE.Geometry();
    }

    for (i = 0; i < citiesL; i += step){
      lat = cities[i];
      lng = cities[i + 1];
        
      color = new THREE.Color(0xffffff);
      size = 0;

      for (var j = 0; j <= 180; j++){
        if (lng === j)
          addPoint(lat, lng, size, color, wedge[j]);
      }
      for (var j = -179; j < 0; j++){
        if (lng === j){
          //j = j * -1;
          j = 360 + j;
          addPoint(lat, lng, size, color, wedge[j]);
        }
      }
    }
    
    var subgeo = [];

    for (var i = 0; i < 360; i++){
      subgeo[i] = new THREE.Geometry();
    }
    
    for (i = 0; i < citiesL; i += step){
      lat = cities[i];
      lng = cities[i + 1];
      
      color = new THREE.Color(0xffffff);
      size = cities[i + 2];
      size = size*300;
      //size = Math.random() * 50;

      for (var j = 0; j <= 180; j++){
        if (lng === j)
          addPoint(lat, lng, size, color, subgeo[j]);

      }
      for (var j = -179; j < 0; j++){
        if (lng === j){
          //j = j * -1;
          j = 360 + j;
          addPoint(lat, lng, size, color, subgeo[j]);
        }
      }
    }

    for (var i = 0; i < 360; i++){
      wedge[i].morphTargets.push({'name': 'target', vertices: subgeo[i].vertices});
    }
  }

  function addPoint(lat, lng, size, color, subgeo){

    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    point.position.y = 200 * Math.cos(phi);
    point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    point.lookAt(mesh.position);

    point.scale.z = Math.max( size, 0.1 ); // avoid non-invertible matrix
    point.updateMatrix();

    for (var i = 0; i < point.geometry.faces.length; i++) {

      point.geometry.faces[i].color = color;
    }
    //THREE.GeometryUtils.merge(subgeo, point);
    subgeo.merge (point.geometry, point.matrix);
  }

  function createPoints(){
    var color = '#'+Math.floor(Math.random()*16777215).toString(16);
    for (var i = 0; i < 360; i++){
      points[i] = new THREE.Mesh(wedge[i], new THREE.MeshBasicMaterial({
            // color: '#'+Math.floor(Math.random()*16777215).toString(16),
            color: 0x00b4ff,
            vertexColors: THREE.FaceColors,
            morphTargets: true
      }));
      scene.add(points[i]);
    }
    // Rainbow_Gradient();
  }

  function Rainbow_Gradient(){

    var red = 1;
    var green = 0;
    var blue = 1;
    for (var i = 0; i < 60; i++){
      
      for (var j = 0; j < points[i].geometry.faces.length; j++ ){
        points[i].geometry.faces[j].color.setRGB(red,green,blue);	
      }
      blue -= 0.0167;
    }

    for (var i = 60; i < 120; i++){
      
      for (var j = 0; j < points[i].geometry.faces.length; j++ ){
        points[i].geometry.faces[j].color.setRGB(red,green,blue);	
      }
      green += 0.0167;		
    }

    for (var i = 120; i < 180; i++){
      
      for (var j = 0; j < points[i].geometry.faces.length; j++ ){
        points[i].geometry.faces[j].color.setRGB(red,green,blue);	
      }
      red -= 0.0167;		
    }

    for (var i = 180; i < 240; i++){
      
      for (var j = 0; j < points[i].geometry.faces.length; j++ ){
        points[i].geometry.faces[j].color.setRGB(red,green,blue);	
      }
      blue += 0.0167;
    }

    for (var i = 240; i < 300; i++){
      
      for (var j = 0; j < points[i].geometry.faces.length; j++ ){
        points[i].geometry.faces[j].color.setRGB(red,green,blue);
      }
      green -= 0.0167;
    }

    for (var i = 300; i < 360; i++){
      
      for (var j = 0; j < points[i].geometry.faces.length; j++ ){
        points[i].geometry.faces[j].color.setRGB(red,green,blue);
      }
      red += 0.0167;
    }
  }

  function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseMove(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance/1000;

    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
  }

  function onMouseUp(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1200 ? 1200 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate() {
    
    var average_seg = new Uint8Array (analyser.frequencyBinCount);
    analyser.getByteFrequencyData(average_seg);
    
    var average_all;
    
    average_all = getAverageVolume (average_seg, 0, average_seg.length, 512);
    
    render(average_seg, average_all);
    stats.update();
    requestAnimationFrame(animate);
  }

  function render(average_seg, average_all) {
    zoom(curZoomSpeed);

    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;

    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

    var intensity = average_all / 100;

    for (var i = 20; i < 360; i++){
      points[i].rotation.y += intensity * 0.015;
      points[i-20].morphTargetInfluences[0] = average_seg[i]/100;
    }
    for (var i = 0; i < 20; i++){
      points[i].rotation.y += intensity * 0.015;
      points[i+340].morphTargetInfluences[0] = average_seg[i]/100;
    }
    
    camera.lookAt(mesh.position);
    renderer.render(scene, camera);
  }

  init();
  this.animate = animate;
  this.addData = addData;
  this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;

  return this;
};
