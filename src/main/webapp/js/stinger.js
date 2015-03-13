'use strict';
var wireframe = false;
var dimensionsLength = 20000;
var gravityImpulse = -9.81;
var motorImpulse = -gravityImpulse * 5; //250.0
var maxMotorOnTime = 3;
var createTarget = function () {
    var geometry = new THREE.CylinderGeometry(1, 3, 10, 16, 16, false);
    var material = new THREE.MeshLambertMaterial({color: 0xFFFFFF, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
};
var createMissile = function () {
    var geometry = new THREE.CylinderGeometry(0.08, 0.04, 2, 16, 16, false);
    var material = new THREE.MeshLambertMaterial({color: 0xFF0000, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
};
var createGround = function () {
    var geometry = new THREE.PlaneGeometry(dimensionsLength, dimensionsLength, 10, 10);
    var material = new THREE.MeshLambertMaterial({color: 0x018E0E, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);
    var rotationAxis = new THREE.Vector3(1, 0, 0);

    rotationAxis.normalize();

    mesh.rotateOnAxis(rotationAxis, -Math.PI / 2);
    mesh.receiveShadow = true;
    return mesh;
};
var createSky = function () {
    var geometry = new THREE.SphereGeometry(dimensionsLength, 10, 10);
    var material = new THREE.MeshLambertMaterial({color: 0x87CEEB, side: THREE.BackSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
};
var createSun = function () {
    var light = new THREE.PointLight(0xFFFFFF, 1, dimensionsLength * 10);

    light.position.set(dimensionsLength * 0.5, dimensionsLength, dimensionsLength * 0.5);

    return light;
};
var createView = function (domId) {
    var domIdQuery = "#" + domId;
    var width = $(domIdQuery).width();
    var height = $(domIdQuery).height();
    var view = {
        camera: new THREE.PerspectiveCamera(75, width / height, 0.1, 3 * dimensionsLength),
        scene: new THREE.Scene(),
        renderer: new THREE.WebGLRenderer({canvas : document.getElementById(domId), antialias : true}),
        ground: createGround(),
        sky: createSky(),
        sun: createSun(),
        target: createTarget(),
        missile: createMissile(),
        missileVector: new THREE.Vector3(0, 1, -1),
        motorOnTime: 0
    };
    

    view.scene.add(view.ground);
    view.scene.add(view.sky);
    view.scene.add(view.sun);
    view.scene.add(view.target);
    view.scene.add(view.missile);

    view.target.position.set(0, 500, -1000);
    view.missile.position.set(0, 0.5, -3);
    view.missileVector.normalize();

    view.missileVector.setLength(1);
    
    view.renderer.setSize(width, height);

    return view;
};

// once everything is loaded, we run our Three.js stuff.
$(function () {
    var clock = new THREE.Clock();
    var frames = 0;

    var views = {
        launcherToTarget: createView("view-launcher-to-target"),
        targetToLauncher: createView("view-target-to-launcher")
    };
    var animateLauncherToTargetCamera = function (view) {
        view.camera.position.setZ(0);
        view.camera.position.setY(2);
        view.camera.lookAt(views.launcherToTarget.target.position);
    };
    var animateTargetToLauncherCamera = function (view) {

        view.camera.position.setX(view.target.position.x + 10);
        view.camera.position.setY(view.target.position.y + 20);
        view.camera.position.setZ(view.target.position.z - 20);

        view.camera.lookAt(views.launcherToTarget.target.position);
    };
    var vectorToString = function (vector) {
        return "(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
    }
    var animateMissile = function (view, delta) {
        var missilePosition = view.missile.position;
        if (missilePosition.y >= 0) {
            var deltaGravityImpulse = gravityImpulse * delta;
            var gravityVector = new THREE.Vector3(0, deltaGravityImpulse, 0);
            var motorOn = view.motorOnTime <= maxMotorOnTime;
            
            if (motorOn) {
                var deltaMotorImpulse = motorImpulse * delta;
                var motorVector = new THREE.Vector3(0, 1, -1);
                
                motorVector.setLength(deltaMotorImpulse);
                
                missilePosition.add(motorVector);
            }

            view.motorOnTime += delta;
            missilePosition.add(gravityVector);

            console.log("Missile: MotorOn=" + motorOn + "; " + vectorToString(missilePosition));
        }
    };
    var animate = function (delta) {
        _.each(_.values(views), function (view) {
            animateMissile(view, delta);
        });

        animateLauncherToTargetCamera(views.launcherToTarget);
        animateTargetToLauncherCamera(views.targetToLauncher);

    };
    var render = function () {
        var delta = clock.getDelta();


        if ((++frames % 120) === 0) {
            var fps = 1.0 / delta;

            console.log("FPS : " + fps);
        }

        animate(delta);

        _.each(_.values(views), function (view) {
            view.renderer.render(view.scene, view.camera);
        });

        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
});
