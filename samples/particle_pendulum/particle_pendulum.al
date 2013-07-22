% File: ClassicParticlePendulumEuler.txt
%---------------------------------------------------------------
NewtonianFrame N % Newtonian reference frame (ground)
RigidFrame B % Massless, inextensible (rigid) string
Particle Q % Particle at end of string
%---------------------------------------------------------------
Variable theta'' % Pendulum angle
Constant L, g % Length of string, gravity
Q.SetMass( m )
%---------------------------------------------------------------
% Rotational/translational kinematics and relevant forces.
Bo.Translate(No, 0>)
B.RotateZ( N, theta )
Q.Translate( No, -L*By> )
Q.AddForceGravity( -g*Ny> )
%---------------------------------------------------------------
% Equations of motion (angular momentum principle)
Zero> = System.GetDynamics( No )
Zero = Dot( Zero>, Nz> )
Solve( Zero, theta'' )
%---------------------------------------------------------------
KE = System.GetKineticEnergy()
PE = Q.GetForceGravityPotentialEnergy( -g*Ny>, No )
MechanicalEnergy = KE + PE
%---------------------------------------------------------------
% Integration parameters (e.g., integration step and error tolerances)
Input tFinal=10 sec, integStp=0.02 sec, absError=1.0E-08, relError=1.0E-08
%---------------------------------------------------------------
% Input values for constants, initial values for variables.
Input m = 2 kg, L = 50 cm, g = 9.8 m/sec^2
Input theta=30 deg, theta'=0 deg/sec
%---------------------------------------------------------------
% Quantities to be output by ODE command.
Output t sec, theta deg, theta' deg/sec, KE Joules, PE Joules, MechanicalEnergy Joules
%---------------------------------------------------------------
animate(N, No)
ODE() particle_pendulum