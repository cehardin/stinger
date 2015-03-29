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

    mesh.rotateOnAxis(new THREE.Vector3(0,0,1), -Math.PI / 2);
    
    return mesh;
};
var createMissile = function () {
    var geometry = new THREE.CylinderGeometry(0.08, 0.04, 2, 16, 16, false);
    var material = new THREE.MeshLambertMaterial({color: 0x009922, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    mesh.rotateOnAxis(new THREE.Vector3(1,0,0), -Math.PI / 2);
    return mesh;
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
        renderer: new THREE.WebGLRenderer({canvas: document.getElementById(domId), antialias: true, alpha: true}),
        ground: createGround(),
        sky: createSky(),
        sun: createSun(),
        target: createTarget(),
        missile: createMissile(),
        missileVector: new THREE.Vector3(0, 0, 0),
        motorOnTime: 0.0,
        missileExploded: false,
        missileExplosion: null,
        missileSpeed: 0.0,
        smoke: [],
        sinceSmoke: 0.0,
        elapsedSeconds: 0.0
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
        var x = view.target.position.x >= 0 ? 2 : -2;
        view.camera.position.setX(x);
        view.camera.position.setY(1);
        view.camera.position.setZ(4);
        view.camera.lookAt(view.target.position);
    };
    var animateTargetToLauncherCamera = function (view) {
        var x = view.target.position.x >= 0 ? -2 : 2;
        view.camera.position.setX(view.target.position.x + x);
        view.camera.position.setY(view.target.position.y + 2);
        view.camera.position.setZ(view.target.position.z - 10);

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
        var z = view.missile.position.z > view.target.position.z ? -10 : 10;
        view.camera.position.setX(view.target.position.x + 10);
        view.camera.position.setY(view.target.position.y + 10);
        view.camera.position.setZ(view.target.position.z + z);

        view.camera.lookAt(view.missile.position);
    };
    var vectorToString = function (vector) {
        return "(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
    }
    var animateTarget = function (view, delta) {
        var elapsed = view.elapsedSeconds;
//        var radius = 2000.0;
//        var v = (elapsed % 60) / 60;
//        var x = radius * Math.sin(v);
//        var y = radius * Math.cos(v);
//        var z = -3000;
        var x = 1000;// - 200 * elapsed;
        var y = 1000;
        var z = -2000;

        view.target.position.set(x, y, z);
    }
    var animateMissile = function (view, delta) {

        //create smoke mesh and update opacity
        _.forEach(view.smoke, function (s) {
            var opacity;

            s.elapsed += delta;
            opacity = s.elapsed <= 1.0 ? 1.0 : 1.0 / s.elapsed * 4.0;

            if (s.mesh === null) {
                var geometry = new THREE.SphereGeometry(1.0);
                var material = new THREE.MeshLambertMaterial({color: 0xCCCCCC});
                var mesh = new THREE.Mesh(geometry, material);

                material.transparent = true;
                material.opacity = opacity;
                mesh.position.copy(s.position.clone());
                view.scene.add(mesh);
                s.mesh = mesh;
            }
            else {
                s.mesh.material.opacity = opacity;
            }
        });

        if (launchMissile) {
            var missileOrientation = new THREE.Vector3();
            var missilePosition = view.missile.position;
            var targetPosition = view.target.position;
            var missileVector = view.missileVector;


            if (missilePosition.y >= 0 && !view.missileExploded) {
                var deltaGravityImpulse = gravityImpulse * delta * delta;
                var gravityVector = new THREE.Vector3(0, deltaGravityImpulse, 0);
                var motorOn = view.motorOnTime <= maxMotorOnTime;
                var smokeOn = view.motorOnTime <= maxMotorOnTime * 3;
                var explode = view.motorOnTime > 16;

                missileVector.add(gravityVector);

                if (motorOn) {
                    var deltaMotorImpulse = motorImpulse * delta * delta;
                    var motorVector = new THREE.Vector3(view.target.position.x, view.target.position.y, view.target.position.z);

                    motorVector.normalize();

                    motorVector.setLength(deltaMotorImpulse);

                    missileVector.add(motorVector);
                    missileOrientation.add(motorVector.normalize());
                }

                if (smokeOn) {
                    view.sinceSmoke += delta;
                    if (view.sinceSmoke > 0.01) {
                        view.smoke.push({
                            position: missilePosition.clone(),
                            elapsed: 0,
                            mesh: null
                        });
                        view.sinceSmoke = 0.0;
                    }
                }

                //steer and bleed energy
                {
                    missileVector = targetPosition.clone().sub(missileVector).normalize().setLength(missileVector.length());
                }

                view.motorOnTime += delta;

                missilePosition.add(missileVector);
                missileOrientation.add(gravityVector.normalize());

                view.missileSpeed = view.missileSpeed * 0.90 + (missileVector.length() / delta) * 0.10;

                //missile explosion
                if (explode && !view.missileExploded) {
                    var geometry = new THREE.SphereGeometry(3.0);
                    var material = new THREE.MeshLambertMaterial({color: 0xFF0000, side : THREE.DoubleSide});
                    var mesh = new THREE.Mesh(geometry, material);
                    
                    material.transparent = true;
                    material.opacity = 0.75;
                    mesh.position.copy(missilePosition);
                    view.missileExploded = true;
                    view.scene.remove(view.missile);
                    view.scene.add(mesh);
                    view.missileVector = new THREE.Vector3(0,0,0);
                }
            }
            else {
                view.missileSpeed = 0;
            }
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
        var missileFlightTime = Math.floor(view.motorOnTime);

        $("#missile-altitude").text(missileAltitude);
        $("#missile-speed").text(missileSpeed);
        $("#missile-distance-launcher").text(distanceToLauncer);
        $("#missile-distance-target").text(distanceToTarget);
        $("#missile-flight-time").text(missileFlightTime);
    }
    var animate = function (delta) {
        _.each(_.values(views), function (view) {
            view.elapsedSeconds += delta;
            animateTarget(view, delta);
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
