/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author aleeper / https://github.com/aleeper
 */

THREE.OrbitControls = function ( object, domElement ) {

    this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	this.enabled = true;

	this.center = new THREE.Vector3();

	this.userZoom = true;
	this.userZoomSpeed = 1.0;

	this.userRotate = true;
	this.userRotateSpeed = 1.0;

	this.userPan = true;
	this.userPanSpeed = 1.0;

	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	this.minDistance = 0;
	this.maxDistance = Infinity;

	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// internals

	var scope = this;

	var EPS = 0.000001;
	var PIXELS_PER_ROUND = 1800;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var zoomStart = new THREE.Vector2();
	var zoomEnd = new THREE.Vector2();
	var zoomDelta = new THREE.Vector2();

	var panStart =  new THREE.Vector2();
	var panEnd =    new THREE.Vector2();
	var panDelta =  new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;

	var defaultUp = new THREE.Vector3( 0, 1, 0); // y-up is assumed
	var unitZ = new THREE.Vector3( 0, 0, 1); // Needed for the case when camera.up = [0, -1, 0]

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
	var state = STATE.NONE;

	// events

	var changeEvent = { type: 'change' };

	this.move = function ( delta ) {
		var objectMatrix = this.object.matrix;
		var rM = new THREE.Matrix4();
		rM.extractRotation(objectMatrix);
        var el = rM.elements;
		var x_axis = new THREE.Vector3(el[0], el[1], el[2]);
        var y_axis = new THREE.Vector3(el[4], el[5], el[6]);
        var z_axis = new THREE.Vector3(el[8], el[9], el[10]);

		var offset = new THREE.Vector3();
		offset.add(		x_axis.clone().multiplyScalar(delta.x))
			.add(	y_axis.clone().multiplyScalar(delta.y))
			.add(	z_axis.clone().multiplyScalar(delta.z));
		scope.center.add(offset);
		scope.object.position.add(offset);

	};


	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateRight = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta += angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	this.rotateDown = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta += angle;

	};

	this.zoomIn = function ( zoomScale ) {

		if ( zoomScale === undefined ) {

			zoomScale = getZoomScale();

		}

		scale /= zoomScale;

	};

	this.zoomOut = function ( zoomScale ) {

		if ( zoomScale === undefined ) {

			zoomScale = getZoomScale();

		}

		scale *= zoomScale;

	};

	this.pan = function ( distance ) {

		distance.transformDirection( this.object.matrix );
		distance.multiplyScalar( scope.userPanSpeed );

		this.object.position.add( distance );
		this.center.add( distance );

	};




	this.update = function () {

		var position = this.object.position;
		var offset = position.clone().sub( this.center );

		// If the camera "up" vector is not [0,1,0], rotate local
		// frame for the purposes of the subsequent polar calculations.
		var didRotate = false;
		var angle = this.object.up.angleTo(defaultUp);
		if ( angle > EPS ) {

			var didRotate = true;
			var rotAxis;

			if(angle < Math.PI - EPS)
				rotAxis = this.object.up.clone().cross(defaultUp).normalize();
			else
				rotAxis = unitZ;

			var quat = new THREE.Quaternion();
			quat.setFromAxisAngle(rotAxis, angle);
			offset.applyQuaternion(quat);

		}

		// angle from z-axis around y-axis

		var theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate ) {

			this.rotateLeft( getAutoRotationAngle() );

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// If we originally applied a local rotation, now we rotate back!
		if ( didRotate ) {

			offset.applyQuaternion(quat.inverse());

		}

		position.copy( this.center ).add( offset );

		this.object.lookAt( this.center );

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );

		}

	};


	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.userZoomSpeed );

	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		if ( scope.userRotate === false ) return;

		event.preventDefault();

		if ( event.button === 0 ) {

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} else if ( event.button === 1 ) {

			state = STATE.ZOOM;

			zoomStart.set( event.clientX, event.clientY );

		} else if ( event.button === 2 && scope.userPan ) {

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}

		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'mouseup', onMouseUp, false );

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		if ( state === STATE.ROTATE ) {

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed );
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.ZOOM ) {

			zoomEnd.set( event.clientX, event.clientY );
			zoomDelta.subVectors( zoomEnd, zoomStart );

			if ( zoomDelta.y > 0 ) {

				scope.zoomIn();

			} else {

				scope.zoomOut();

			}

			zoomStart.copy( zoomEnd );

		} else if ( state === STATE.PAN ) {

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			var position = scope.object.position;
			var offset = position.clone().sub( scope.center );
            if(scope.object instanceof THREE.PerspectiveCamera)
            {
                // https://github.com/ros-visualization/rviz/blob/hydro-devel/src/rviz/
                //         default_plugin/view_controllers/orbit_view_controller.cpp
                var fovY = scope.object.fov * Math.PI / 180.0;
                var fovX = fovY*scope.object.aspect;
                var distance = offset.length();

                var width = scope.domElement.clientWidth;
                var height = scope.domElement.clientHeight;
//                console.log(vsprintf("viewPort size: [%d , %d ], camera fov %.1f aspect %.3f",
//                    [width, height, scope.object.fov, scope.object.aspect]));
                var diff_x = panDelta.x;
                var diff_y = panDelta.y;
                var moveVec = new THREE.Vector3( -(diff_x / width) * distance * Math.tan( fovX / 2.0 ) * 2.0,
                    (diff_y / height) * distance * Math.tan( fovY / 2.0 ) * 2.0,
                    0.0 );
            } else {
                var moveVec = new THREE.Vector3(-1.0*panDelta.x, panDelta.y, panDelta.z);
                moveVec.multiplyScalar(scope.userPanSpeed * offset.length());
            }

			scope.move(moveVec);

			panStart.copy( panEnd );

//			var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
//			var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
//			scope.pan( new THREE.Vector3( - movementX, movementY, 0 ) );

		}

	}

	function onMouseUp( event ) {

		if ( scope.enabled === false ) return;
		if ( scope.userRotate === false ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );

		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false ) return;
		if ( scope.userZoom === false ) return;

		var delta = 0;

		if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.zoomOut();

		} else {

			scope.zoomIn();

		}

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false ) return;
		if ( scope.userPan === false ) return;

		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( new THREE.Vector3( 0, 1, 0 ) );
				break;
			case scope.keys.BOTTOM:
				scope.pan( new THREE.Vector3( 0, - 1, 0 ) );
				break;
			case scope.keys.LEFT:
				scope.pan( new THREE.Vector3( - 1, 0, 0 ) );
				break;
			case scope.keys.RIGHT:
				scope.pan( new THREE.Vector3( 1, 0, 0 ) );
				break;
		}

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
	this.domElement.addEventListener( 'keydown', onKeyDown, false );

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
