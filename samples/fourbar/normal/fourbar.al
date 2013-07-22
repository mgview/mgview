%% Fourbar with Constraint Stabilization

NewtonianFrame N
RigidBody A,B,C
Point Na(N), Ab(A), Bc(B), Cn(N), Cb(C)

variable qA'', qB'', qC'', Rx, Ry
constant La, Lb, Lc, Ln, g, H
constant kp, kv

A.rotateZ(N, qA)
B.rotateZ(N, qB)
C.rotateZ(N, qC)

Acm.translate(Na, 1/2*La*ax> )
Ab.translate(Na, La*ax> )
Ao.translate(Acm, 0>) 	%% Needed for the animation

Bcm.translate(Ab, 1/2*Lb*bx> )
Bc.translate(Ab, Lb*bx> )
Bo.translate(Bcm, 0>) 	%% Needed for the animation

Cn.translate(Na, Ln*ny> )
Ccm.translate(Cn, 1/2*Lc*cx> )
Cb.translate(Cn, Lc*cx> )
Co.translate(Ccm, 0>) 	%% Needed for the animation

A.setMass(mA)
B.setMass(mB)
C.setMass(mC)

Ia = mA*La^2/12
Ib = mB*Lb^2/12
Ic = mC*Lc^2/12
A.setInertia( Acm, 0, Ia, Ia)
B.setInertia( Bcm, 0, Ib, Ib)
C.setInertia( Ccm, 0, Ic, Ic)

A.addForceGravity( g*nx> )
B.addForceGravity( g*nx> )
C.addForceGravity( g*nx> )

Bc.addForce( Rx*nx> + Ry*ny> )
Cb.addForce( -Rx*nx> - Ry*ny> )
Bc.addForce( H*ny> )

loop> = La*ax> + Lb*bx> - Lc*cx> - Ln*ny>
loop = [dot(loop>, nx>); dot(loop>, ny>)]
loopdt = dt(loop)
loopdtdt = dtdt(loop)

matrix[1] = dot( nz>, A.getDynamics(Na) + B.getDynamics(Na) )
matrix[2] = dot( nz>, B.getDynamics(Ab) )
matrix[3] = dot( nz>, C.getDynamics(Cn) )
matrix[4] = loopdtdt[1] + kv*loopdt[1] + kp*loop[1]
matrix[5] = loopdtdt[2] + kv*loopdt[2] + kp*loop[2]

input La = 1 m, Lb = 2 m, Lc = 2 m, Ln = 1 m
input mA = 10 kg, mB = 20 kg, mC = 20 kg
input qA' = 0, qB' = 0, qC' = 0
input qA = 30 deg
input g = 9.81, H = 0 N
input tFinal = 10 sec, integStp = 0.05 sec
%% Pick wrong (but reasonable) initial conditions for qB and qC
input qB = 40 deg, qC = 55 deg

%% paramters for the constraint stabilization
zeta = 1
wn = 5
input kp = wn^2, kv = 2*zeta*wn
%input kp = 0, kv = 0

%% Don't need this with the constraint stabilization
%solvesetinput( loop, qB = 30 deg, qC = 35 deg)


solve(matrix, qA'', qB'', qC'', Rx, Ry)
animate(N, Na, A, B, C) 	%% Makes files fourbar.1, fourbar.2, fourbar.3 with simulation data 
ode() fourbar



