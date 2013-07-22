% File: wheel.txt
%--------------------------------------------------------------
% Let's define nz> "up" and cx> as the wheel's rotation axis.

NewtonianFrame N
RigidFrame A, B
RigidBody C
%--------------------------------------------------------------
Variable theta'', phi'', wC'
Constant g, Lc, r, b
C.setMass(m)
C.SetInertia( Ccm, m*r^2/2*(2*Bx>*Bx> + By>*By> + Bz>*Bz>) )
%--------------------------------------------------------------------
% Rotation matrices, angular velocity, and angular acceleration
A.rotateZ(N, theta)
B.rotateY(A, phi)
Express( W_B_N>, B )
C.setAngularVelocityAcceleration(B, wC*bx>)
%--------------------------------------------------------------------
% Position, velocity, and acceleration
Ao.translate(No, 0>)
Bo.translate(No, 0>)
Ccm.translate(No, Lc*bx>)
Co.translate(Ccm, 0>)
%--------------------------------------------------------------------
% Gravity forces acting on C
Ccm.addForce( -m*g*nz>)
C.addTorque( -b*wC*bx>)
%--------------------------------------------------------------------
% Angular momentum principle and simplification
zero> = C.getDynamics(No)

Zero[1] = Dot( Zero>, Bx> )
Zero[2] = Dot( Zero>, By> )
Zero[3] = Dot( Zero>, Bz> )
%--------------------------------------------------------------------
Solve( Zero, theta'', phi'', wC' )
%--------------------------------------------------------------------

%Pause

input Lc = 0.2 m, r = 0.5 m
input m = 2 kg
input wC = 100 rad/sec
input tFinal = 5 sec
input phi  = 0, theta  = 0
input phi' = 0, theta' = 0
input b = 0.3
input g = 9.81


%x = dot(Ccm.getPosition(No), nx>)
%y = dot(Ccm.getPosition(No), ny>)
%z = dot(Ccm.getPosition(No), nz>)
%d = sqrt(x^2 + y^2)

animate(N, No, A,B, Co)
output t, d, z, theta, phi
ODE() wheel
