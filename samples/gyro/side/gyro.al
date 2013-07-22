% File: PrecessingNutatingSpinningGyro.al
%--------------------------------------------------------------
NewtonianFrame N
RigidFrame A, B
RigidBody C
%--------------------------------------------------------------
Variable theta'', phi'', wC' % Angles and spin rate
Constant g, L, r % Gravity, length, radius
C.SetMass( m ) % Mass and inertia properties
C.SetInertia( Ccm, m*r^2/4*(Bx>*Bx> + By>*By> + 2*Bz>*Bz>) )
%--------------------------------------------------------------------
% Rotation matrices, angular velocity, and angular acceleration
A.RotateNegativeZ( N, theta )
B.RotateNegativeX( A, phi )
Express( W_B_N>, B )
C.SetAngularVelocityAcceleration( B, wC*Bz> )
%--------------------------------------------------------------------
% Position, velocity, and acceleration
Ao.translate(No, 0>) % Needed for animate()
Bo.translate(No, 0>) % Needed for animate()
CCm.Translate( No, L*Bz> )
Co.Translate( Ccm, 0> ) % Needed for animate()
%--------------------------------------------------------------------
% Gravity forces acting on B and C
CCm.AddForce( -m*g*Nz> )
%--------------------------------------------------------------------
% Angular momentum principle and simplification
Zero> = C.GetDynamics( No )
FactorQuadratic( Zero>, theta', phi', wC )
%--------------------------------------------------------------------
% Scalar equations of motion
Zero[1] = Dot( Zero>, Bx> )
Zero[2] = Dot( Zero>, By> )
Zero[3] = Dot( Zero>, Bz> )
%--------------------------------------------------------------------
Solve( Zero, theta'', phi'', wC' )
%--------------------------------------------------------------------
% C's linear/angular momentum and kinetic/potential energy
L> = C.GetLinearMomentum()
H> = C.GetAngularMomentum( No )
KE = C.GetKineticEnergy()
PE = C.GetForceGravityPotentialEnergy( -g*Nz>, No )
KePe = KE + PE % Total mechanical energy
%--------------------------------------------------------------------
Hnz = Dot( H>, Nz> ) % Nz> component of angular momentum
Hbz = Dot( H>, Bz> ) % Bz> component of angular momentum
%--------------------------------------------------------------------
% Integration parameters (integration step and error tolerances)
Input tFinal=10 sec, integStp=0.05 sec, absError=1.0E-07, relError=1.0E-07
%--------------------------------------------------------------------
Input g=9.81 m/sec^2, L=0.2 m, r=0.2 m, m=0.1 kg
Input theta=0 deg, phi=80 deg, wc=300 rpm
Input theta'=0 deg/sec, phi'=0 deg/sec
animate(N, No, A, B, Co)
%Output t sec, theta deg, phi deg, KePe Joules, Hnz kg*m^2/sec, Hbz kg*m^2/sec
Code ODE() gyro
%--------------------------------------------------------------------
