'use strict';
var wireframe = false;
var dimensionsLength = 200000;
var gravityImpulse = -9.81;
var motorImpulse = 300.0;
var maxMotorOnTime = 3;
var createTarget = function () {
    var geometry = new THREE.CylinderGeometry(1, 3, 10, 16, 16, false);
    var material = new THREE.MeshPhongMaterial({color: 0xFF0000, side: THREE.FrontSide, wireframe: wireframe});
    var mesh = new THREE.Mesh(geometry, material);

    mesh.rotateOnAxis(new THREE.Vector3(0,0,1), Math.PI / 2);
    
    return mesh;
};
var createMissile = function () {
    var geometry = new THREE.CylinderGeometry(0.08, 0.04, 2, 16, 16, false);
    var material = new THREE.MeshLambertMaterial({color: 0xFF0000, side: THREE.FrontSide, wireframe: wireframe});
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
    var texture = createTexture("ground3.jpg");

    texture.repeat.set(50, 50);

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
        missileVector: new THREE.Vector3(0,0,-1),
        motorOnTime: 0.0,
        missileExploded: false,
        missileExplosion: null,
        missileSpeed: 0.0,
        targetSpeed: 0.0,
        smoke: [],
        sinceSmoke: 0.0,
        elapsedSeconds: 0.0
    };


    view.scene.add(view.ground);
    view.scene.add(view.sky);
    view.scene.add(view.sun);
    view.scene.add(new THREE.AmbientLight(0x808080));
    view.scene.add(view.target);
    view.scene.add(view.missile);

    view.target.position.set(0, 1000, -3000);
    view.missile.position.set(0, 0.5, -3);
    view.missileVector.normalize();

    view.missileVector.setLength(.00000000001);

    view.renderer.setSize(width, height);

    return view;
};

// once everything is loaded, we run our Three.js stuff.
$(function () {
    var clock = new THREE.Clock();
    var averageDelta = 0.0;
    var launchMissile = false;
    var minimumDistance = 9999999999999;
    var xLead = 0;
    var yLead = 0;
    var missileHit = false;
    var targetHeight = 50 + Math.random() * 2000;
    var targetStartX = 500 + Math.random() * 6000;
    var targetY = -500 - Math.random() * 4000;
    var targetSpeed = 100 + Math.random() * 300;

    var views = {
        launcherToTarget: createView("view-launcher-to-target"),
        targetToLauncher: createView("view-target-to-launcher"),
        missileTotarget: createView("view-missile-to-target"),
        targetToMissile: createView("view-target-to-missile")
    };
    var animateLauncherToTargetCamera = function (view) {
        view.camera.position.setX(0);
        view.camera.position.setY(2);
        view.camera.position.setZ(0);
        view.camera.lookAt(view.target.position);
    };
    var animateTargetToLauncherCamera = function (view) {
        view.camera.position.setX(view.target.position.x + 0);
        view.camera.position.setY(view.target.position.y + 10);
        view.camera.position.setZ(view.target.position.z - 15);

        view.camera.lookAt(new THREE.Vector3(0, 0, 0));
    };
    var animateMissileToTargetCamera = function (view) {
        view.camera.position.setX(view.missile.position.x);
        view.camera.position.setY(view.missile.position.y);
        view.camera.position.setZ(view.missile.position.z);

        view.camera.lookAt(view.target.position);
    };
    var animateTargetToMissileCamera = function (view) {
        view.camera.position.setX(view.target.position.x + 0);
        view.camera.position.setY(view.target.position.y + 20);
        view.camera.position.setZ(view.target.position.z - 45);

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
        var speed = -targetSpeed; //-200
        var x = targetStartX + speed * elapsed;
        var y = targetHeight;
        var z = targetY;

        if(!missileHit) {
            view.target.position.set(x, y, z);
            view.targetSpeed = Math.abs(speed);
        }
    }
    var animateMissile = function (view, delta) {

        //create smoke mesh and update opacity
        _.forEach(view.smoke, function (s) {
            var opacity;

            s.elapsed += delta;
            opacity = s.elapsed <= 1.0 ? 1.0 : 1.0 / s.elapsed * 4.0;

            if (s.mesh === null) {
                var geometry = new THREE.SphereGeometry(3.0);
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
                    var motorVector = missileVector.clone().normalize().setLength(deltaMotorImpulse);

                    missileVector.add(motorVector);
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

                //steer and lead target
                {
                    var length = missileVector.length();
                    var vector = targetPosition.clone().sub(missilePosition).normalize();
                    var xLeadRadians = THREE.Math.degToRad(xLead);
                    var yLeadRadians = THREE.Math.degToRad(targetPosition.x > 0 ? yLead : -yLead);
                    
                    vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), xLeadRadians).normalize();
                    vector.applyAxisAngle(new THREE.Vector3(0, 0, 1), yLeadRadians).normalize();
                    
                    missileVector.copy(vector.setLength(length));
                }

                view.motorOnTime += delta;

                missilePosition.add(missileVector);

                view.missileSpeed = view.missileSpeed * 0.90 + (missileVector.length() / delta) * 0.10;

                //missile explosion
                if ((explode || missileHit) && !view.missileExploded) {
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
            view.missileVector.copy(view.target.position).normalize();
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
        var targetAltitude = Math.floor(targetPosition.y);
        var framesPerSecond = Math.round(1.0 / averageDelta);
        var targetSpeed = Math.floor(view.targetSpeed);
        
        if(launchMissile && distanceToTarget < 10) {
            missileHit = true;
        }
        minimumDistance = Math.min(minimumDistance, distanceToTarget);
        
        $("#missile-altitude").text(missileAltitude);
        $("#missile-speed").text(missileSpeed);
        
        $("#missile-distance-launcher").text(distanceToLauncer);
        $("#missile-distance-target").text(distanceToTarget);
        
        $("#target-altitude").text(targetAltitude);
        $("#target-speed").text(targetSpeed);
        
        $("#missile-flight-time").text(missileFlightTime);
        $("#frames-per-second").text(framesPerSecond);
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
    };
    var render = function () {
        var delta = clock.getDelta();

        averageDelta = averageDelta * 0.9 + delta * 0.1;

        animate(delta);
        updateInfo(views.launcherToTarget);

        _.each(_.values(views), function (view) {
            view.renderer.render(view.scene, view.camera);
        });

        requestAnimationFrame(render);
    };
    
    
    $("#lead-key-q").addClass("selected-lead");
    xLead = 10;
    yLead = 10;
    
    /**
     * To apply lead and super-elevation
     */
    $("*").keydown(function(event) {
        if(event.which === 83) {
            $(".lead").removeClass("selected-lead");
            $("#lead-key-s").addClass("selected-lead");
            xLead = 0;
            yLead = 0;
        } else if(event.which === 81) {
            $(".lead").removeClass("selected-lead");
            $("#lead-key-q").addClass("selected-lead");
            xLead = 10;
            yLead = 10;
        } else if(event.which === 87) {
            $(".lead").removeClass("selected-lead");
            $("#lead-key-w").addClass("selected-lead");
            xLead = 0;
            yLead = 10;
        } else if(event.which === 69) {
            $(".lead").removeClass("selected-lead");
            $("#lead-key-e").addClass("selected-lead");
            xLead = -10;
            yLead = 10;
        } else if(event.which === 65) {
            $(".lead").removeClass("selected-lead");
            $("#lead-key-a").addClass("selected-lead");
            xLead = 10;
            yLead = 0;
        } else if(event.which === 68) {
            $(".lead").removeClass("selected-lead");
            $("#lead-key-d").addClass("selected-lead");
            xLead = -10;
            yLead = 0;
        }
    });
    

    /**
     * To launch
     */
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
