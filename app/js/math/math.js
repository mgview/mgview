/**
 * @param frustum 
 * @param radius - float
 * @param origin - vec3
 */
function checkSphereInFrustum(frustum, radius, origin) {
    var x = origin[0], y = origin[1], z = - origin[2]; // Z is negative when in frustum
    
    // Z component within planes
    if (z > frustum.far + radius || z < frustum.near - radius) {
        return false;
    }
    
    // Y component
    var alpha = frustum.fov / 2.0 * (Math.PI / 180.0);
    var d = radius / Math.cos(alpha);
    
    var ht = Math.sin(alpha) * z;
    
    if (Math.abs(y) > ht + d) {
        return false;
    }
    
    // X component
    var h_alpha = alpha * frustum.aspect;
    var h_d = radius / Math.cos(h_alpha);
    var h_ht = ht * frustum.aspect;
    
    if (Math.abs(x) > h_ht + h_d) {
        return false;
    }
    
    return true;
}

function quaternionToEuler(q) {
    var qX = q[0], qY = q[1], qZ = q[2], qW = q[3];

    var sqx = qX * qX;
    var sqy = qY * qY;
    var sqz = qZ * qZ;
    var sqw = qW * qW;

    return {
    	r: Math.atan2(2 * (qY * qZ + qW * qX), sqw - sqx - sqy + sqz),
    	p: Math.asin(-2 * (qX * qZ - qW * qY)),
    	y: Math.atan2(2 * (qX * qY + qW * qZ), sqw + sqx - sqy - sqz)
    };
}

/**
 * Calculate the planes of a frustum with the given points
 * @param p [[-x, +y, near], 
 *           [+x, +y, near], 
 *           [+x, -y, near], 
 *           [-x, -y, near],
 *           [-x, +y, far],  
 *           [+x, +y, far],  
 *           [+x, -y, far],  
 *           [-x, -y, far]]
 * @returns array[6][4] of plane coefficients
 */
function getFrustumPlanes(p) {
	var planes = [getPlaneFromPoints(p[0], p[1], p[2]),   // near
				  getPlaneFromPoints(p[4], p[6], p[5]),   // far
				  getPlaneFromPoints(p[4], p[0], p[3]),   // left
				  getPlaneFromPoints(p[1], p[5], p[2]),   // right
				  getPlaneFromPoints(p[3], p[2], p[6]),   // top
				  getPlaneFromPoints(p[0], p[4], p[1])];  // bottom

	var point_test = [6, 0, 6, 7, 4, 7];

	for (var i = 0; i < 6; ++i) {
		var j = point_test[i];
		var test = planes[i][0] * p[j][0] + planes[i][1] * p[j][1] + planes[i][2] * p[j][2] + planes[i][3];
		if (test < 0) {
			planes[i][0] = -planes[i][0];
			planes[i][1] = -planes[i][1];
			planes[i][2] = -planes[i][2];
			planes[i][3] = -planes[i][3];
		}
	}		

	return planes;
}

/**
 * Calculate the plane for given points
 * @param p0 [x,y,z]
 * @param p1 [x,y,z]
 * @param p2 [x,y,z] 
 * @returns array[4] of plane coefficients
 */

function getPlaneFromPoints(p0, p1, p2) {
	var x1 = p0[0], y1 = p0[1], z1 = p0[2],
		x2 = p1[0], y2 = p1[1], z2 = p1[2],
		x3 = p2[0], y3 = p2[1], z3 = p2[2];

	var D = det3([[x1, y1, z1],
	              [x2, y2, z2],
	              [x3, y3, z3]]);
	
	if (D == 0) {
		return [0.0, 0.0, -1.0 / z1, 1.0];
	}

	var d = 1.0;

	var k = -d / D;

	var a = k * det3([[1.0,  y1,  z1],
	                  [1.0,  y2,  z2],
	                  [1.0,  y3,  z3]]);
	var b = k * det3([[ x1, 1.0,  z1],
	                  [ x2, 1.0,  z2],
	                  [ x3, 1.0,  z3]]);
	var c = k * det3([[ x1,  y1, 1.0],
	                  [ x2,  y2, 1.0],
	                  [ x3,  y3, 1.0]]);
	
	return [a, b, c, d];
}

/**
 * @param planes array[6][4] of plane coeffs
 * @param box_min array[3] for box min
 * @param box_min array[3] for box max
 * @returns bool True if box intersects frustum
 */
function getFrustumAABBIntersection(planes, box_min, box_max) {
    var x_low  = box_min[0], y_low  = box_min[1], z_low  = box_min[2];
    var x_high = box_max[0], y_high = box_max[1], z_high = box_max[2];
    
	for (var i = 0; i < 6; ++i) {
		var a = planes[i][0], b = planes[i][1], c = planes[i][2], d = planes[i][3];

		if (a * x_low  + b * y_low  + c * z_low  + d > 0)
			continue;
		if (a * x_high + b * y_low  + c * z_low  + d > 0)
			continue;
		if (a * x_low  + b * y_high + c * z_low  + d > 0)
			continue;
		if (a * x_high + b * y_high + c * z_low  + d > 0)
			continue;
		if (a * x_low  + b * y_low  + c * z_high + d > 0)
			continue;
		if (a * x_high + b * y_low  + c * z_high + d > 0)
			continue;
		if (a * x_low  + b * y_high + c * z_high + d > 0)
			continue;
		if (a * x_high + b * y_high + c * z_high + d > 0)
			continue;
		
		return false;
	}

	return true;
}

function planeRayIntersection(ray, plane) {
	var P0 = ray[0], V = ray[1];

	var k1 = plane[0] * P0[0] + plane[1] * P0[1] + plane[2] * P0[2] + plane[3];
	var k2 = V[0] * plane[0] + V[1] * plane[1] + V[2] * plane[2];
	var t = -k1 / k2;

	return [P0[0] + t * V[0], P0[1] + t * V[1], P0[2] + t * V[2]];
}

function boxRayIntersects(box_min, box_max, origin, direction, t0, t1) {
	var parameters    = [box_min, box_max];
	var inv_direction = [1.0 / direction[0], 1.0 / direction[1], 1.0 / direction[2]];
	var sign          = [inv_direction[0] < 0 ? 1 : 0, inv_direction[1] < 0 ? 1 : 0, inv_direction[2] < 0 ? 1 : 0];
	
	var tmin  = (parameters[    sign[0]][0] - origin[0]) * inv_direction[0];
	var tmax  = (parameters[1 - sign[0]][0] - origin[0]) * inv_direction[0];
	var tymin = (parameters[    sign[1]][1] - origin[1]) * inv_direction[1];
	var tymax = (parameters[1 - sign[1]][1] - origin[1]) * inv_direction[1];
	if ((tmin > tymax) || (tymin > tmax))
		return false;
	if (tymin > tmin)
		tmin = tymin;
	if (tymax < tmax)
		tmax = tymax;
	var tzmin = (parameters[    sign[2]][2] - origin[2]) * inv_direction[2];
	var tzmax = (parameters[1 - sign[2]][2] - origin[2]) * inv_direction[2];
	if ((tmin > tzmax) || (tzmin > tmax))
		return false;
	if (tzmin > tmin)
		tmin = tzmin;
	if (tzmax < tmax)
		tmax = tzmax;

	return ((tmin < t1) && (tmax > t0));
}

function det3(m) {
	var a = m[0][0], b = m[0][1], c = m[0][2],
		d = m[1][0], e = m[1][1], f = m[1][2],
		g = m[2][0], h = m[2][1], i = m[2][2];

	return a * e * i + b * f * g + c * d * h - a * f * h - b * d * i - c * e * g;
}

/**
 * Returns the transformation matrix for a normal estimated from points in pts within radius of center.
 */
function estimateNormalWithinSphere(center, radius, pts) {
	var r2 = radius * radius;

	var cx = center[0],
		cy = center[1],
		cz = center[2];
			
	var points = [];
	for (var i = 0, n = pts.length; i < n; ++i) {
		var pt = pts[i];
		
		var dx = pt[0] - cx,
			dy = pt[1] - cy,
			dz = pt[2] - cz;

		var d2 = dx * dx + dy * dy + dz * dz;
		if (d2 < r2) {
			points.push(pt);
		}
	}
	
	if (points.length < 3) {
		return null;
	}

	try {
		return estimateNormal(points);
	}
	catch (ex) {
		return null;
	}
}

function nearestPointToPoint(p, pts) {
	var nearest = null;

	var min_D2 = 999999.9;

	var px = p[0], py = p[1], pz = p[2];
	
	for (var i = 0, len = pts.length; i < len; ++i) {
		var x = pts[i][0], y = pts[i][1], z = pts[i][2];
		
		var dx = x - px,
			dy = y - py,
			dz = z - pz;
		
		var D2 = dx * dx + dy * dy + dz * dz;
		if (D2 < min_D2) {
			min_D2 = D2;
			nearest = [x, y, z];
		}
	}
	
	return nearest;
}

function pointsNearLine(line_dir, line_pt, pts, dist) {
	if (Math.abs(1.0 - dot(line_dir, line_dir)) > 0.00001) {
		throw 'direction isn`t unit vector';
	}

	var near_pts = [];
	
	var Mx = line_dir[0],
		My = line_dir[1],
		Mz = line_dir[2];
	
	var Bx = line_pt[0],
		By = line_pt[1],
		Bz = line_pt[2];
	
	var max_D2 = dist * dist;
	
	for (var i = 0, len = pts.length; i < len; ++i) {
		var P = pts[i];

		var Kx = P[0] - Bx,
			Ky = P[1] - By,
			Kz = P[2] - Bz;
		
		var t0 = Mx * Kx + My * Ky + Mz * Kz;

		var Sx = Kx - t0 * Mx,
			Sy = Ky - t0 * My,
			Sz = Kz - t0 * Mz;

		var D2 = Sx * Sx + Sy * Sy + Sz * Sz;
		if (D2 <= max_D2) {
			near_pts.push(P);
		}
	}

	return near_pts;
}

/**
 * Return the closest 3d point to a line specified by a unit direction vector and a point on the line.
 */
function nearestPointToLine(line_dir, line_pt, pts) {
	if (Math.abs(1.0 - dot(line_dir, line_dir)) > 0.00001) {
		throw 'direction isn`t unit vector';
	}

	var min_D2 = 999999.9;
	var nearest_pt = null;
	
	var Mx = line_dir[0],
		My = line_dir[1],
		Mz = line_dir[2];
	
	var Bx = line_pt[0],
		By = line_pt[1],
		Bz = line_pt[2];
	
	for (var i = 0, len = pts.length; i < len; ++i) {
		var P = pts[i];

		var Kx = P[0] - Bx,
			Ky = P[1] - By,
			Kz = P[2] - Bz;
		
		var t0 = Mx * Kx + My * Ky + Mz * Kz;

		var Sx = Kx - t0 * Mx,
			Sy = Ky - t0 * My,
			Sz = Kz - t0 * Mz;
		
		var D2 = Sx * Sx + Sy * Sy + Sz * Sz;
		
		if (D2 < min_D2) {
			min_D2 = D2;
			nearest_pt = P;
		}
	}
	
	return { p: nearest_pt, D: Math.sqrt(min_D2) };
}

function estimateNormal(points) {
	var x_min = points[0],
		x_max = points[0],
		y_max = points[0];
	
	var A_entries = [],
		b_entries = [];
	
	for (var i = 0, len = points.length; i < len; ++i) {
		var p = points[i];

		A_entries.push([p[0], p[1], 1.0]);
		b_entries.push([p[2]]);
		
		if (p[0] < x_min[0]) {
			x_min = p;
		}
		else if (p[0] > x_max[0]) {
			x_max = p;
		}
		if (p[1] > y_max[1]) {
			y_max = p;
		}
	}
	var A = new Matrix(A_entries),
		b = new Matrix(b_entries);
	
	var x = solve(A, b);
	
	var pa = x.A[0][0],
		pb = x.A[1][0],
		pc = x.A[2][0];
	var getZ = function(point) {
		return pa * point[0] + pb * point[1] + pc;
	};

	var p0 = [x_min[0], x_min[1], getZ(x_min)],
		p1 = [x_max[0], x_max[1], getZ(x_max)],
		p2 = [y_max[0], y_max[1], getZ(y_max)];

	var v1 = normalize(subVector(p1, p0)),
		v2 = normalize(subVector(p2, p0));
	
	var n = normalize(cross(v1, v2));
	
	var v1 = cross(n, v2);

	return [v1, v2, n];
}

function solve(A, b) {
	var SVD = A.svd();
	var x = SVD.getV().times(SVD.getS().inverse().times(SVD.getU().transpose())).times(b);
	return x;
}

/**
 * Creates a 4-by-4 matrix which rotates around the given axis by the given angle.
 * @param {(!array3|!array4)} axis The axis about which to rotate.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!array44} A matrix which rotates angle radians around the axis.
 */
function axisRotation(axis, angle) {
    var x = axis[0];
    var y = axis[1];
    var z = axis[2];
    var n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    var xx = x * x;
    var yy = y * y;
    var zz = z * z;
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var oneMinusCosine = 1 - c;

    return [[xx + (1 - xx) * c, x * y * oneMinusCosine + z * s, x * z * oneMinusCosine - y * s, 0],
            [x * y * oneMinusCosine - z * s, yy + (1 - yy) * c, y * z * oneMinusCosine + x * s, 0],
            [x * z * oneMinusCosine + y * s, y * z * oneMinusCosine - x * s, zz + (1 - zz) * c, 0],
            [0, 0, 0, 1]];
}

/**
 * Computes a 4-by-4 rotation matrix (with trivial translation component)
 * given a quaternion.  We assume the convention that to rotate a vector v by
 * a quaternion r means to express that vector as a quaternion q by letting
 * q = [v[0], v[1], v[2], 0] and then obtain the rotated vector by evaluating
 * the expression (r * q) / r.
 * @param {!array4} q The quaternion.
 * @return {!array44} A 4-by-4 rotation matrix.
 */
function quaternionToRotation(q) {
    var qX = q[0];
    var qY = q[1];
    var qZ = q[2];
    var qW = q[3];

    var qWqW = qW * qW;
    var qWqX = qW * qX;
    var qWqY = qW * qY;
    var qWqZ = qW * qZ;
    var qXqW = qX * qW;
    var qXqX = qX * qX;
    var qXqY = qX * qY;
    var qXqZ = qX * qZ;
    var qYqW = qY * qW;
    var qYqX = qY * qX;
    var qYqY = qY * qY;
    var qYqZ = qY * qZ;
    var qZqW = qZ * qW;
    var qZqX = qZ * qX;
    var qZqY = qZ * qY;
    var qZqZ = qZ * qZ;

    var d = qWqW + qXqX + qYqY + qZqZ;

    return [[(qWqW + qXqX - qYqY - qZqZ) / d, 2 * (qWqZ + qXqY) / d, 2 * (qXqZ - qWqY) / d, 0],
            [2 * (qXqY - qWqZ) / d, (qWqW - qXqX + qYqY - qZqZ) / d, 2 * (qWqX + qYqZ) / d, 0],
            [2 * (qWqY + qXqZ) / d, 2 * (qYqZ - qWqX) / d, (qWqW - qXqX - qYqY + qZqZ) / d, 0],
            [0, 0, 0, 1]];
}

/**
 * Computes a quaternion whose rotation is equivalent to the given matrix.
 * Based on an algorithm from Shoemake SIGGRAPH 1987.
 * @param {(!array44|!array33)} m A 3-by-3 or 4-by-4 rotation matrix.
 * @return {!Quaternion} A quaternion q such that quaternions.quaternionToMatrix(q) is m.
 */
function rotationToQuaternion(m) {
    var u, v, w;

    var q = [];

    var m0 = m[0];
    var m1 = m[1];
    var m2 = m[2];

    var m00 = m0[0];
    var m11 = m1[1];
    var m22 = m2[2];

    var trace = m00 + m11 + m22;
    if (trace > 0) {
        var r = Math.sqrt(1 + trace);
        var k = 0.5 / r;
        return [(m1[2] - m2[1]) * k,
                (m2[0] - m0[2]) * k,
                (m0[1] - m1[0]) * k,
                0.5 * r];
    }

    var mu, mv, mw;

    // Choose u, v, and w such that u is the index of the biggest diagonal entry
    // of m, and u v w is an even permutation of 0 1 and 2.
    if (m00 > m11 && m00 > m22) {
        u  = 0;
        mu = m0;
        v  = 1;
        mv = m1;
        w  = 2;
        mw = m2;
    }
    else if (m11 > m00 && m11 > m22) {
        u  = 1;
        mu = m1;
        v  = 2;
        mv = m2;
        w  = 0;
        mw = m0;
    }
    else {
        u  = 2;
        mu = m2;
        v  = 0;
        mv = m0;
        w  = 1;
        mw = m1;
    }

    var r = Math.sqrt(1 + mu[u] - mv[v] - mw[w]);
    var k = 0.5 / r;
    q[u] = 0.5 * r;
    q[v] = (mv[u] + mu[v]) * k;
    q[w] = (mu[w] + mw[u]) * k;
    q[3] = (mv[w] - mw[v]) * k;

    return q;
}

/**
 * Performs linear interpolation on two scalars.
 * Given scalars a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {number} a Operand scalar.
 * @param {number} b Operand scalar.
 * @param {number} t Interpolation coefficient.
 * @return {number} The weighted sum of a and b.
 */

function lerpScalar(a, b, t) {
	return (1 - t) * a + t * b;
}

/**
 * Adds two vectors; assumes a and b have the same dimension.
 * @param {!array} a Operand vector.
 * @param {!array} b Operand vector.
 * @return {!array} The sum of a and b.
 */
function addVector(a, b) {
    var r = [];
    var aLength = a.length;
    for (var i = 0; i < aLength; ++i)
        r[i] = a[i] + b[i];
    return r;
}

/**
 * Subtracts two vectors.
 * @param {!array} a Operand vector.
 * @param {!array} b Operand vector.
 * @return {!array} The difference of a and b.
 */
function subVector(a, b) {
    var r = [];
    var aLength = a.length;
    for (var i = 0; i < aLength; ++i)
        r[i] = a[i] - b[i];
    return r;
}

/**
 * Performs linear interpolation on two vectors.
 * Given vectors a and b and interpolation coefficient t, returns
 * (1 - t) * a + t * b.
 * @param {!array} a Operand vector.
 * @param {!array} b Operand vector.
 * @param {number} t Interpolation coefficient.
 * @return {!array} The weighted sum of a and b.
 */
function lerpVector(a, b, t) {
	var r = [];
	var aLength = a.length;
	for (var i = 0; i < aLength; ++i)
		r[i] = (1 - t) * a[i] + t * b[i];
	return r;
}

/**
 * Divides a vector by its Euclidean length and returns the quotient.
 * @param {!array} a The vector.
 * @return {!array} The normalized vector.
 */
function normalize(a) {
    var r = [];
    var n = 0.0;
    var aLength = a.length;
    for (var i = 0; i < aLength; ++i)
        n += a[i] * a[i];
    n = Math.sqrt(n);
    for (var i = 0; i < aLength; ++i)
        r[i] = a[i] / n;
    return r;
}

/**
 * Negates a vector.
 * @param {!array} v The vector.
 * @return {!array} -v.
 */
function negativeVector(v) {
   var r = [];
   var vLength = v.length;
   for (var i = 0; i < vLength; ++i) {
       r[i] = -v[i];
   }
   return r;
}

/**
 * Multiplies two scalars.
 * @param {number} a Operand scalar.
 * @param {number} b Operand scalar.
 * @return {number} The product of a and b.
 */
function mulScalarScalar(a, b) {
    return a * b;
}

/**
 * Multiplies a scalar by a vector.
 * @param {number} k The scalar.
 * @param {!array} v The vector.
 * @return {!array} The product of k and v.
 */
function mulScalarVector(k, v) {
    var r = [];
    var vLength = v.length;
    for (var i = 0; i < vLength; ++i) {
        r[i] = k * v[i];
    }
    return r;
}

/**
 * Multiplies a vector by a scalar.
 * @param {!array} v The vector.
 * @param {number} k The scalar.
 * @return {!array} The product of k and v.
 */
function mulVectorScalar(v, k) {
    return mulScalarVector(k, v);
}

//

function flattenMatrix(m) {
    var result = [];

    if (m.length == 0)
        return result;

    for (var j = 0, lenj = m[0].length; j < lenj; j++)
        for (var i = 0, leni = m.length; i < leni; i++)
            result.push(m[i][j]);

    return result;
}

// Spherical linear interpolation
function slerp(qa, qb, t, shortest) {
    var q0 = normalize(qa);
    var q1 = normalize(qb);
    
    var epsilon = 0.0001;

    if (Math.abs(q0[0] - q1[0]) + Math.abs(q0[1] - q1[1]) + Math.abs(q0[2] - q1[2]) + Math.abs(q0[3] - q1[3]) < epsilon) {
    	return q0;
    }

    var ca = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];
    if (shortest && ca < 0) {
        ca = -ca;
        neg_q1 = true;
    }
    else {
        neg_q1 = false;
    }
    
    var o  = Math.acos(ca);
    var so = Math.sin(o);

    if (Math.abs(so) <= epsilon) {
        return [q0[0], q0[1], q0[2], q0[3]];
    }

    var a = Math.sin(o * (1.0 - t)) / so;
    var b = Math.sin(o * t) / so;
    if (neg_q1) {
        return [q0[0] * a - q1[0] * b,
                q0[1] * a - q1[1] * b,
                q0[2] * a - q1[2] * b,
                q0[3] * a - q1[3] * b];
    }
    else {
        return [q0[0] * a + q1[0] * b,
                q0[1] * a + q1[1] * b,
                q0[2] * a + q1[2] * b,
                q0[3] * a + q1[3] * b];
    }
}

// Spherical quadratic interpolation.
function squad(a, b, c, d, t) {
    return slerp(slerp(a, d, t, true), slerp(b, c, t, true), 2 * t * (1.0 - t));
}

/**
 * Takes a 4-by-4 matrix and a vector with 3 entries,
 * interprets the vector as a point, transforms that point by the matrix, and
 * returns the result as a vector with 3 entries.
 * @param {!array44} m The matrix.
 * @param {!array3} v The point.
 * @return {!array3} The transformed point.
 */
function transformPoint(m, v) {
    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];
    var m0 = m[0];
    var m1 = m[1];
    var m2 = m[2];
	var m3 = m[3];

    var d = v0 * m0[3] + v1 * m1[3] + v2 * m2[3] + m3[3];

    return [(v0 * m0[0] + v1 * m1[0] + v2 * m2[0] + m3[0]) / d,
            (v0 * m0[1] + v1 * m1[1] + v2 * m2[1] + m3[1]) / d,
            (v0 * m0[2] + v1 * m1[2] + v2 * m2[2] + m3[2]) / d];
}

/**
 * Takes a 4-by-4 matrix and a vector with 3 entries, interprets the vector as a
 * direction, transforms that direction by the matrix, and returns the result;
 * assumes the transformation of 3-dimensional space represented by the matrix
 * is parallel-preserving, i.e. any combination of rotation, scaling and
 * translation, but not a perspective distortion. Returns a vector with 3
 * entries.
 * @param {!array44} m The matrix.
 * @param {!array3} v The direction.
 * @return {!array3} The transformed direction.
 */
function transformDirection(m, v) {
    var v0 = v[0];
    var v1 = v[1];
    var v2 = v[2];
    var m0 = m[0];
    var m1 = m[1];
    var m2 = m[2];
    var m3 = m[3];

    return [v0 * m0[0] + v1 * m1[0] + v2 * m2[0],
            v0 * m0[1] + v1 * m1[1] + v2 * m2[1],
            v0 * m0[2] + v1 * m1[2] + v2 * m2[2]];
}

// Scalar operations

/**
 * Converts degrees to radians.
 * @param {number} degrees A value in degrees.
 * @return {number} the value in radians.
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} radians A value in radians.
 * @return {number} the value in degrees.
 */
function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

// Vector operations

/**
 * Computes the dot product of two vectors; assumes that a and b have the same dimension.
 * @param {!array} a Operand vector.
 * @param {!array} b Operand vector.
 * @return {number} The dot product of a and b.
 */
function dot(a, b) {
    var r = 0.0;
    var aLength = a.length;
    for (var i = 0; i < aLength; ++i)
        r += a[i] * b[i];
    return r;
}

/**
 * Computes the cross product of two vectors; assumes both vectors have
 * three entries.
 * @param {!array} a Operand vector.
 * @param {!array} b Operand vector.
 * @return {!array} The vector a cross b.
 */
function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]];
}

// Matrix operations

/**
 * Takes the transpose of a matrix.
 * @param {!arrayMN} m The matrix.
 * @return {!arrayMN} The transpose of m.
 */
function transpose(m) {
    var r = [];
    var m0Length = m[0].length;
    var mLength = m.length;
    for (var j = 0; j < m0Length; ++j) {
        r[j] = [];
        for (var i = 0; i < mLength; ++i)
            r[j][i] = m[i][j];
    }
    return r;
}

/**
 * Multiplies two 4-by-4 matrices; assumes that the given matrices are 4-by-4;
 * assumes matrix entries are accessed in [row][column] fashion.
 * @param {!array44} a The matrix on the left.
 * @param {!array44} b The matrix on the right.
 * @return {!array44} The matrix product of a and b.
 */
function mulMatrixMatrix4(a, b) {
    var a0 = a[0];
    var a1 = a[1];
    var a2 = a[2];
    var a3 = a[3];
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    var b3 = b[3];
    var a00 = a0[0];
    var a01 = a0[1];
    var a02 = a0[2];
    var a03 = a0[3];
    var a10 = a1[0];
    var a11 = a1[1];
    var a12 = a1[2];
    var a13 = a1[3];
    var a20 = a2[0];
    var a21 = a2[1];
    var a22 = a2[2];
    var a23 = a2[3];
    var a30 = a3[0];
    var a31 = a3[1];
    var a32 = a3[2];
    var a33 = a3[3];
    var b00 = b0[0];
    var b01 = b0[1];
    var b02 = b0[2];
    var b03 = b0[3];
    var b10 = b1[0];
    var b11 = b1[1];
    var b12 = b1[2];
    var b13 = b1[3];
    var b20 = b2[0];
    var b21 = b2[1];
    var b22 = b2[2];
    var b23 = b2[3];
    var b30 = b3[0];
    var b31 = b3[1];
    var b32 = b3[2];
    var b33 = b3[3];
    return [[a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
             a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
             a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
             a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33],
            [a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
             a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
             a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
             a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33],
            [a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
             a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
             a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
             a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33],
            [a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
             a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
             a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
             a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33]];
}

/**
 * Computes the inverse of a 4-by-4 matrix.
 * @param {!array44} m The matrix.
 * @return {!array44} The inverse of m.
 */
function inverse4(m) {
    var tmp_0 = m[2][2] * m[3][3];
    var tmp_1 = m[3][2] * m[2][3];
    var tmp_2 = m[1][2] * m[3][3];
    var tmp_3 = m[3][2] * m[1][3];
    var tmp_4 = m[1][2] * m[2][3];
    var tmp_5 = m[2][2] * m[1][3];
    var tmp_6 = m[0][2] * m[3][3];
    var tmp_7 = m[3][2] * m[0][3];
    var tmp_8 = m[0][2] * m[2][3];
    var tmp_9 = m[2][2] * m[0][3];
    var tmp_10 = m[0][2] * m[1][3];
    var tmp_11 = m[1][2] * m[0][3];
    var tmp_12 = m[2][0] * m[3][1];
    var tmp_13 = m[3][0] * m[2][1];
    var tmp_14 = m[1][0] * m[3][1];
    var tmp_15 = m[3][0] * m[1][1];
    var tmp_16 = m[1][0] * m[2][1];
    var tmp_17 = m[2][0] * m[1][1];
    var tmp_18 = m[0][0] * m[3][1];
    var tmp_19 = m[3][0] * m[0][1];
    var tmp_20 = m[0][0] * m[2][1];
    var tmp_21 = m[2][0] * m[0][1];
    var tmp_22 = m[0][0] * m[1][1];
    var tmp_23 = m[1][0] * m[0][1];

    var t0 = (tmp_0 * m[1][1] + tmp_3 * m[2][1] + tmp_4 * m[3][1]) - (tmp_1 * m[1][1] + tmp_2 * m[2][1] + tmp_5 * m[3][1]);
    var t1 = (tmp_1 * m[0][1] + tmp_6 * m[2][1] + tmp_9 * m[3][1]) - (tmp_0 * m[0][1] + tmp_7 * m[2][1] + tmp_8 * m[3][1]);
    var t2 = (tmp_2 * m[0][1] + tmp_7 * m[1][1] + tmp_10 * m[3][1]) - (tmp_3 * m[0][1] + tmp_6 * m[1][1] + tmp_11 * m[3][1]);
    var t3 = (tmp_5 * m[0][1] + tmp_8 * m[1][1] + tmp_11 * m[2][1]) - (tmp_4 * m[0][1] + tmp_9 * m[1][1] + tmp_10 * m[2][1]);

    var d = 1.0 / (m[0][0] * t0 + m[1][0] * t1 + m[2][0] * t2 + m[3][0] * t3);

    var row0 = [d * t0, d * t1, d * t2, d * t3];
    var row1 = [d * ((tmp_1 * m[1][0] + tmp_2 * m[2][0] + tmp_5 * m[3][0]) - (tmp_0 * m[1][0] + tmp_3 * m[2][0] + tmp_4 * m[3][0])),
                d * ((tmp_0 * m[0][0] + tmp_7 * m[2][0] + tmp_8 * m[3][0]) - (tmp_1 * m[0][0] + tmp_6 * m[2][0] + tmp_9 * m[3][0])),
                d * ((tmp_3 * m[0][0] + tmp_6 * m[1][0] + tmp_11 * m[3][0]) - (tmp_2 * m[0][0] + tmp_7 * m[1][0] + tmp_10 * m[3][0])),
                d * ((tmp_4 * m[0][0] + tmp_9 * m[1][0] + tmp_10 * m[2][0]) - (tmp_5 * m[0][0] + tmp_8 * m[1][0] + tmp_11 * m[2][0]))];
    var row2 = [d * ((tmp_12 * m[1][3] + tmp_15 * m[2][3] + tmp_16 * m[3][3]) - (tmp_13 * m[1][3] + tmp_14 * m[2][3] + tmp_17 * m[3][3])),
                d * ((tmp_13 * m[0][3] + tmp_18 * m[2][3] + tmp_21 * m[3][3]) - (tmp_12 * m[0][3] + tmp_19 * m[2][3] + tmp_20 * m[3][3])),
                d * ((tmp_14 * m[0][3] + tmp_19 * m[1][3] + tmp_22 * m[3][3]) - (tmp_15 * m[0][3] + tmp_18 * m[1][3] + tmp_23 * m[3][3])),
                d * ((tmp_17 * m[0][3] + tmp_20 * m[1][3] + tmp_23 * m[2][3]) - (tmp_16 * m[0][3] + tmp_21 * m[1][3] + tmp_22 * m[2][3]))];
    var row3 = [d * ((tmp_14 * m[2][2] + tmp_17 * m[3][2] + tmp_13 * m[1][2]) - (tmp_16 * m[3][2] + tmp_12 * m[1][2] + tmp_15 * m[2][2])),
                d * ((tmp_20 * m[3][2] + tmp_12 * m[0][2] + tmp_19 * m[2][2]) - (tmp_18 * m[2][2] + tmp_21 * m[3][2] + tmp_13 * m[0][2])),
                d * ((tmp_18 * m[1][2] + tmp_23 * m[3][2] + tmp_15 * m[0][2]) - (tmp_22 * m[3][2] + tmp_14 * m[0][2] + tmp_19 * m[1][2])),
                d * ((tmp_22 * m[2][2] + tmp_16 * m[0][2] + tmp_21 * m[1][2]) - (tmp_20 * m[1][2] + tmp_23 * m[2][2] + tmp_17 * m[0][2]))];

    return [row0, row1, row2, row3];
}

// Create matrices

/**
 * Creates an n-by-n identity matrix.
 * @param {number} n The dimension of the identity matrix required.
 * @return {!arrayNN} An n-by-n identity matrix.
 */
function identityMatrix(n) {
    var r = [];
    for (var j = 0; j < n; ++j) {
        r[j] = [];
        for (var i = 0; i < n; ++i)
            r[j][i] = (i == j) ? 1 : 0;
    }
    return r;
}

/**
 * Creates a 4-by-4 identity matrix.
 * @return {!array44} A 4-by-4 identity matrix.
 */
function identityMatrix4() {
    return [[1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]];
}

function translationMatrix(v) {
    return [[1, 0, 0, v[0]],
            [0, 1, 0, v[1]],
            [0, 0, 1, v[2]],
            [0, 0, 0, 1]];
}

function scalingMatrix(v) {
    return [[v[0],    0,    0, 0],
            [   0, v[1],    0, 0],
            [   0,    0, v[2], 0],
            [   0,    0,    0, 1]];	
}

/**
 * Computes a 4-by-4 perspective transformation matrix given the angular height
 * of the frustum, the aspect ratio, and the near and far clipping planes.  The
 * arguments define a frustum extending in the negative z direction.  The given
 * angle is the vertical angle of the frustum, and the horizontal angle is
 * determined to produce the given aspect ratio.  The arguments near and far are
 * the distances to the near and far clipping planes.  Note that near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  The matrix generated sends the viewing frustum to the unit box.
 * We assume a unit box extending from -1 to 1 in the x and y dimensions and
 * from 0 to 1 in the z dimension.
 * @param {number} angle The camera angle from top to bottom (in radians).
 * @param {number} aspect The aspect ratio width / height.
 * @param {number} near The depth (negative z coordinate) of the near clipping plane.
 * @param {number} far The depth (negative z coordinate) of the far clipping plane.
 * @return {!array44} The perspective matrix.
 */
function perspective(angle, aspect, near, far) {
    var f = Math.tan(0.5 * (Math.PI - angle));
    var range = near - far;

    return [[f / aspect, 0,                  0,  0],
            [         0, f,                  0,  0],
            [         0, 0,        far / range, -1],
            [         0, 0, near * far / range,  0]];
}

/**
 * Computes a 4-by-4 orthographic projection matrix given the coordinates of the
 * planes defining the axis-aligned, box-shaped viewing volume.  The matrix
 * generated sends that box to the unit box.  Note that although left and right
 * are x coordinates and bottom and top are y coordinates, near and far
 * are not z coordinates, but rather they are distances along the negative
 * z-axis.  We assume a unit box extending from -1 to 1 in the x and y
 * dimensions and from 0 to 1 in the z dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!array44} The orthographic projection matrix.
 */
function orthographic(left, right, bottom, top, near, far) {
    return [[2 / (right - left), 0, 0, 0],
            [0, 2 / (top - bottom), 0, 0],
            [0, 0, 1 / (near - far), 0],
            [(left + right) / (left - right), (bottom + top) / (bottom - top), near / (near - far), 1]];
}

/**
 * Computes a 4-by-4 perspective transformation matrix given the left, right,
 * top, bottom, near and far clipping planes. The arguments define a frustum
 * extending in the negative z direction. The arguments near and far are the
 * distances to the near and far clipping planes. Note that near and far are not
 * z coordinates, but rather they are distances along the negative z-axis. The
 * matrix generated sends the viewing frustum to the unit box. We assume a unit
 * box extending from -1 to 1 in the x and y dimensions and from 0 to 1 in the z
 * dimension.
 * @param {number} left The x coordinate of the left plane of the box.
 * @param {number} right The x coordinate of the right plane of the box.
 * @param {number} bottom The y coordinate of the bottom plane of the box.
 * @param {number} top The y coordinate of the right plane of the box.
 * @param {number} near The negative z coordinate of the near plane of the box.
 * @param {number} far The negative z coordinate of the far plane of the box.
 * @return {!o3djs.math.Matrix4} The perspective projection matrix.
 */
function frustum(left, right, bottom, top, near, far) {
    var dx = right - left;
    var dy = top - bottom;
    var dz = near - far;
    return [[2 * near / dx, 0, 0, 0],
            [0, 2 * near / dy, 0, 0],
            [(left + right) / dx, (top + bottom) / dy, far / dz, -1],
            [0, 0, near * far / dz, 0]];
}

/**
 * Computes a 4-by-4 look-at transformation.  The transformation generated is
 * an orthogonal rotation matrix with translation component.  The translation
 * component sends the eye to the origin.  The rotation component sends the
 * vector pointing from the eye to the target to a vector pointing in the
 * negative z direction, and also sends the up vector into the upper half of
 * the yz plane.
 * @param {(!array3|!array4)} eye The position of the eye.
 * @param {(!array3|!array4)} target The position meant to be viewed.
 * @param {(!array3|!array4)} up A vector pointing up.
 * @return {!array44} The look-at matrix.
 */
function lookAt(eye, target, up) {
    var vz = normalize(subVector(eye, target).slice(0, 3)).concat(0);
    var vx = normalize(cross(up, vz)).concat(0);
    var vy = cross(vz, vx).concat(0);

    var i = [eye[0], eye[1], eye[2], 1];
    return inverse4([vx, vy, vz, i]);
}

/**
 * Creates a 4-by-4 matrix which rotates around the x-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!array44} The rotation matrix.
 */
function rotationX(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);

    return [[1,  0, 0, 0],
            [0,  c, s, 0],
            [0, -s, c, 0],
            [0,  0, 0, 1]];
}

/**
 * Creates a 4-by-4 matrix which rotates around the y-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!array44} The rotation matrix.
 */
function rotationY(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);

    return [[c, 0, -s, 0],
            [0, 1,  0, 0],
            [s, 0,  c, 0],
            [0, 0,  0, 1]];
}

/**
 * Creates a 4-by-4 matrix which rotates around the z-axis by the given angle.
 * @param {number} angle The angle by which to rotate (in radians).
 * @return {!array44} The rotation matrix.
 */
function rotationZ(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);

    return [[ c, s, 0, 0],
            [-s, c, 0, 0],
            [ 0, 0, 1, 0],
            [ 0, 0, 0, 1]];
}
