%    File: particle_in_slot.al    www.MotionGenesis.com
%    Date: 6/30/2012
%  Author: Adam Leeper
% Problem: A particle with spring/damper in the slot of a spinning disk
%--------------------------------------------------------------------
%   Default settings
SetAutoEpsilon( 1.0E-14 ) % Rounds off to nearest integer
SetAutoRhs( OFF )         % Set to ON only if you want explicit results (unlikely)
SetAutoZee( OFF )         % Turn ON for efficient calculations or large problems (Professional version)
SetDigits( 5 )            % Number of digits displayed for numbers
%--------------------------------------------------------------------
%   Physical objects
NewtonianFrame N          % Newtonian reference frame
RigidBody      B          % The spinning disk
Particle       Q          % The particle
%--------------------------------------------------------------------
%   Mathematical declarations
Variable    x'', theta''       % Position variables; derivatives
Variable    Fx, Fy        % Reaction forces
Constant    g             % Local gravitational acceleration
Constant    k, Ln         % Parameters for spring
Constant    R             % Radius of disk
Specified   TB            % Torque on B from N
%--------------------------------------------------------------------
%   Mass and inertia properties
B.SetMass( mB )
Q.SetMass( mQ )
B.SetInertia( Bcm, 1, 1, mB*R^2/2 ) % Ixx and Iyy components don't matter.
%--------------------------------------------------------------------
%   Quantities to be left explicit when SetAutoZee(ON)
SetNoZeeSymbol( Fx, Fy )
%--------------------------------------------------------------------
%   Rotational kinematics
B.RotateZ( N, theta )
%--------------------------------------------------------------------
%   Translational kinematics
Bo.Translate(No, 0>)
Bcm.Translate(No, 0>)
Q.Translate( Bcm, x*Bx> )          % Sets position, velocity, acceleration
%--------------------------------------------------------------------
%   Add relevant contact and distance forces
gravity> = -g*Nz>
System.AddForceGravity( gravity> )
Q.AddForceSpring( Bcm, k, Ln )
%--------------------------------------------------------------------
%   Add relevant torques
B.AddTorque( N, TB*Nz> )
%--------------------------------------------------------------------
%   Newton's equations of motion (EoM) (translation)
QTranslationEoM> = Q.GetDynamics()
Zero[1] = Dot( QTranslationEoM>, Bx> )
%--------------------------------------------------------------------
%   Euler equations of motion (EoM) (rotation)
BRotationEoM> = B.GetDynamics( Bcm )
Zero[2] = Dot( BRotationEoM>, Bz> )
%--------------------------------------------------------------------
%   Solve linear equations for list of unknowns
Solve( Zero, x'', theta'' )
%--------------------------------------------------------------------
%   Alternatively, set theta' to some constant and solve for just x''
%theta' = Omega
%theta'' = 0
%Solve( Zero[1], x'')
%--------------------------------------------------------------------
%   Kinetic and potential energy, work function, angular momentum, etc.
KineticEnergy = System.GetKineticEnergy()
GravityPotentialEnergy = 0 %System.GetForceGravityPotentialEnergy( gravity>, No )
SpringPotentialEnergy = Q.GetForceSpringPotentialEnergy( Bcm, k, Ln )
MechanicalEnergy = KineticEnergy + GravityPotentialEnergy + SpringPotentialEnergy
H> = System.GetAngularMomentum(Bcm)
L> = System.GetLinearMomentum()
%--------------------------------------------------------------------
%   Unit system for input/output conversions
SetUnitSystem( kg, meter, sec )  % this is the DEFAULT
%--------------------------------------------------------------------
%   Integration parameters (e.g., integration step and error tolerances)
Input  tFinal=10 sec, integStp=0.01 sec, absError=1.0E-08, relError=1.0E-08
%--------------------------------------------------------------------
%   Input values for constants
Input  g=9.80665 m/sec^2  % Exact as defined by NIST 2006 data
Input  mB=10 kg,  mQ=1 kg
Input  k = 100 N/m, Ln = 0.25
Input  R = 0.5
%--------------------------------------------------------------------
%   Initial values for variables
Input  x=0.4, x'=0 meter/sec
Input  theta=0 deg, theta'=90 deg/sec
%--------------------------------------------------------------------
%   Specified expressions
%--------------------------------------------------------------------
%   Additional expressions to be output.
xN = Dot( Q.GetPosition(No), Nx> )
yN = Dot( Q.GetPosition(No), Ny> )
%--------------------------------------------------------------------
%   Output quantities when ODE command is issued.
Output  t sec, xN m, yN m
%--------------------------------------------------------------------
%   Output quantities for animation with Animake
Animate( N, No, B, Q )
%--------------------------------------------------------------------
%   C/Matlab/Fortran code or immediate numerical solution.
%   ODE( Zero, listOfVariablesToSolve ) [A=0,3,1; B=2,0,-.5] filename.c
ODE() slot

