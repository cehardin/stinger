'use strict';
var wireframe = false;
var dimensionsLength = 200000;
var gravityImpulse = -9.81;
var motorImpulse = 250.0;
var maxMotorOnTime = 3;
var createTarget = function () {
    var geometry = new THREE.CylinderGeometry(1, 3, 10, 16, 16, false);
    var material = new THREE.MeshLambertMaterial({color: 0xFFFFFF, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
};
var createMissile = function () {
    var container = new THREE.Object3D();
    var geometry = new THREE.CylinderGeometry(0.08, 0.04, 2, 16, 16, false);
    var material = new THREE.MeshLambertMaterial({color: 0xFF0000, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    container.add(mesh);
    return container;
};
var createTexture = function (textureFile) {
    var texture = THREE.ImageUtils.loadTexture("textures/" + textureFile);

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
};
var createGroundTexture = function () {
    var texture = createTexture("ground2.png");

    texture.repeat.set(100, 100);

    return texture;
};
var createSkyTexture = function () {
    var texture = createTexture("sky.jpg");

    texture.repeat.set(4, 4);

    return texture;
};
var createGround = function () {
    var texture = createGroundTexture();
    var geometry = new THREE.PlaneGeometry(dimensionsLength, dimensionsLength, 10, 10);
    var material = new THREE.MeshLambertMaterial({color: 0x018E0E, map: texture, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);
    var rotationAxis = new THREE.Vector3(1, 0, 0);

    rotationAxis.normalize();

    mesh.rotateOnAxis(rotationAxis, -Math.PI / 2);
    mesh.receiveShadow = true;
    return mesh;
};
var createSky = function () {
    var texture = createSkyTexture();
    var geometry = new THREE.SphereGeometry(dimensionsLength, 10, 10);
    var material = new THREE.MeshLambertMaterial({color: 0x87CEEB, map: texture, side: THREE.BackSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
};
var createSun = function () {
    var light = new THREE.PointLight(0xFFFFFF, 1, dimensionsLength * 10);

    light.position.set(dimensionsLength * 0.5, dimensionsLength * 0.5, dimensionsLength * 0.5);

    return light;
};
var createView = function (domId) {
    var domIdQuery = "#" + domId;
    var width = $(domIdQuery).width();
    var height = $(domIdQuery).height();
    var view = {
        camera: new THREE.PerspectiveCamera(75, width / height, 0.1, 3 * dimensionsLength),
        scene: new THREE.Scene(),
        renderer: new THREE.WebGLRenderer({canvas: document.getElementById(domId), antialias: true}),
        ground: createGround(),
        sky: createSky(),
        sun: createSun(),
        target: createTarget(),
        missile: createMissile(),
        missileVector: new THREE.Vector3(0, 0, 0),
        motorOnTime: 0.0,
        missileSpeed: 0.0
    };


    view.scene.add(view.ground);
    view.scene.add(view.sky);
    view.scene.add(view.sun);
    view.scene.add(view.target);
    view.scene.add(view.missile);

    view.target.position.set(0, 1000, -3000);
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
    var launchMissile = false;

    var views = {
        launcherToTarget: createView("view-launcher-to-target"),
        targetToLauncher: createView("view-target-to-launcher"),
        missileTotarget: createView("view-missile-to-target"),
        targetToMissile: createView("view-target-to-missile")
    };
    var animateLauncherToTargetCamera = function (view) {
        view.camera.position.setZ(2);
        view.camera.position.setY(2);
        view.camera.lookAt(view.target.position);
    };
    var animateTargetToLauncherCamera = function (view) {
        view.camera.position.setX(view.target.position.x + 10);
        view.camera.position.setY(view.target.position.y + 20);
        view.camera.position.setZ(view.target.position.z - 20);

        view.camera.lookAt(new THREE.Vector3(0, 0, 0));
    };
    var animateMissileToTargetCamera = function (view) {
        var z = view.missile.position.z > view.target.position.z ? 2 : -2;
        view.camera.position.setX(view.missile.position.x);
        view.camera.position.setY(view.missile.position.y);
        view.camera.position.setZ(view.missile.position.z + z);
        
        view.camera.lookAt(view.target.position);
    };
    var animateTargetToMissileCamera = function (view) {
        var z = view.missile.position.z > view.target.position.z ? -20 : 20;
        view.camera.position.setX(view.target.position.x + 10);
        view.camera.position.setY(view.target.position.y + 20);
        view.camera.position.setZ(view.target.position.z + z);

        view.camera.lookAt(view.missile.position);
    };
    var vectorToString = function (vector) {
        return "(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
    }
    var animateMissile = function (view, delta) {

        if (launchMissile) {
            var missileOrientation = new THREE.Vector3();
            var missilePosition = view.missile.position;
            var targetPosition = view.target.position;
            var missileVector = view.missileVector;
            var vectorToTarget;
            var missileVectorOrientation;
            var missileVectorDifference;

            if (missilePosition.y >= 0) {
                var deltaGravityImpulse = gravityImpulse * delta * delta;
                var gravityVector = new THREE.Vector3(0, deltaGravityImpulse, 0);
                var motorOn = view.motorOnTime <= maxMotorOnTime;

                missileVector.add(gravityVector);

                if (motorOn) {
                    var deltaMotorImpulse = motorImpulse * delta * delta;
//                    var motorVector = new THREE.Vector3(0, 1, -1);
                    var motorVector = new THREE.Vector3(view.target.position.x, view.target.position.y, view.target.position.z);

                    motorVector.normalize();

                    motorVector.setLength(deltaMotorImpulse);

                    missileVector.add(motorVector);
                    missileOrientation.add(motorVector.normalize());
                }

                view.motorOnTime += delta;

                missilePosition.add(missileVector);
                missileOrientation.add(gravityVector.normalize());
//            console.log("Missile: MotorOn=" + motorOn + "; " + vectorToString(missilePosition));
            }

            vectorToTarget = targetPosition.clone().sub(missilePosition).normalize();
            missileVectorOrientation = missileVector.clone().normalize();
            missileVectorDifference = vectorToTarget.clone(missileVectorOrientation).normalize();

            view.missile.children.forEach(function (value) {
                value.rotation.set(vectorToTarget.x, vectorToTarget.y, vectorToTarget.z);
            });
        

            view.missileSpeed = view.missileSpeed * 0.90 + (missileVector.length() / delta) * 0.10;
        }
        else {

        }
    };
    var updateInfo = function (view) {
        var launcerPosition = new THREE.Vector3(0, 0, 0);
        var missilePosition = view.missile.position;
        var targetPosition = view.target.position;
        var missileAltitude = Math.floor(view.missile.position.y);
        var missileSpeed = Math.floor(view.missileSpeed);
        var distanceToLauncer = Math.floor(Math.abs(missilePosition.length()));
        var distanceToTarget = Math.floor(Math.abs(targetPosition.clone().sub(missilePosition).length()));

        $("#missile-altitude").text(missileAltitude);
        $("#missile-speed").text(missileSpeed);
        $("#missile-distance-launcher").text(distanceToLauncer);
        $("#missile-distance-target").text(distanceToTarget);
    }
    var animate = function (delta) {
        _.each(_.values(views), function (view) {
            animateMissile(view, delta);
        });

        animateLauncherToTargetCamera(views.launcherToTarget);
        animateTargetToLauncherCamera(views.targetToLauncher);
        animateMissileToTargetCamera(views.missileTotarget);
        animateTargetToMissileCamera(views.targetToMissile);

        updateInfo(views.launcherToTarget);
    };
    var render = function () {
        var delta = clock.getDelta();


        if ((++frames % 120) === 0) {
            var fps = 1.0 / delta;

//            console.log("FPS : " + fps);
        }

        animate(delta);

        _.each(_.values(views), function (view) {
            view.renderer.render(view.scene, view.camera);
        });

        requestAnimationFrame(render);
    };

    $("*").keydown(function (event) {
        if (event.which === 32) {
            event.preventDefault();
            if (launchMissile === false) {
                console.log("Launching missile!");
                launchMissile = true;
            }
        }
    });

    requestAnimationFrame(render);
});
