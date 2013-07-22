% File: EulerParameters3DOrientation.al
%-------------------------------------------------------------------------------
% Physical objects
NewtonianFrame	N
RigidBody		B					% Rotating rigid-body
%-------------------------------------------------------------------------------
% Mathematical declarations
Variable 		wx', wy', wz' 		% Angular velocity measures
Constant 		b+					% Viscous damping constant
Constant		Ixx+, Iyy+, Izz+
Variable    	e0', e1', e2', e3'	% Euler parameters for B in N
SetGeneralizedSpeed( wx, wy, wz )
%-------------------------------------------------------------------------------
% Mass and inertia
B.SetMass( m )
B.SetInertia( Bcm, Ixx, Iyy, Izz )
%-------------------------------------------------------------------------------
% Rotational kinematics
B.SetAngularVelocityAcceleration( N, wx*Bx> + wy*By> + wz*Bz> )
B.SetRotationMatrixODE( N, Quaternion, e0, e1, e2, e3 )
%-------------------------------------------------------------------------------
% Translational kinematics
Bcm.Translate( No, 0> )  % Bcm is motionless in N
Bo.Translate( Bcm, 0> )
%-------------------------------------------------------------------------------
% Relevant forces and torques
Fdrag> = B.AddTorqueDamper( N, b )
%-------------------------------------------------------------------------------
% Solve equations of motion.
ZeroKane = System.GetDynamicsKane()
Solve( ZeroKane, wx', wy', wz' )
%-------------------------------------------------------------------------------
% Kinetic energy, potential energy, and work done on system.
KE = System.GetKineticEnergy()
% Power of System
SystemPower = System.GetPower()
Variable WorkSystem' = Dot( Fdrag>, B.GetAngularVelocity( N ) )
EnergySum = KE - WorkSystem
%-------------------------------------------------------------------------------
%       Input values for constants.  Initial values for variables
Input	Ixx = 1 kg*m^2, Iyy = 2 kg*m^2, Izz = 3 kg*m^2, b = 0.5
Input 	wx = 0.2 rad/sec, wy = 7.0 rad/sec, wz = 0.2 rad/sec
Input 	e0 = 1, e1 = 0, e2 = 0, e3 = 0, WorkSystem = 0 Joules
%-------------------------------------------------------------------------------
%       Numerical integration parameters
Input tFinal = 8 sec, integStp = 0.01 sec, absError=1.0E-7, relError=1.0E-7
%-------------------------------------------------------------------------------
%       List Quantities to be output by ODE command.
Variable phi
phi = GetAngleBetweenUnitVectors( Nz>, Bz> )
Output t sec, wx rad/sec, wy rad/sec, wz rad/sec, phi deg, EnergySum Joules
%-------------------------------------------------------------------------------
%       Tell MG to output all the position vectors and
%       rotation matrices for each body so one can animate the output.
Animate( N, No, B )
%-------------------------------------------------------------------------------
%       C/Matlab/Fortran code or Immediate Numerical Solutions to ODEs
ODE()	EulerParameters3DOrientation.c
ODE()	EulerParameters3DOrientation.m
ODE()	body_quaternion
%-------------------------------------------------------------------------------
% Record input together with responses
Save EulerParameters3DOrientation.all
%Quit