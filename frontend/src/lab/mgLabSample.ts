/** Bundled MG input for the /lab/ editor playground (from samples/disk/disk.txt). */
export const MG_LAB_SAMPLE = `%--------------------------------------------------------------------
%   Physical objects
NewtonianFrame A
RigidFrame B, C
RigidBody D
Point DA(D) %(?)
%--------------------------------------------------------------------
%   Mathematical declarations
constant g = 9.8 m / s^2
constant m = 2 kg
constant r = 0.3429 m
constant I = 1/2*m*r^2
constant J = 1/4*m*r^2

variable H'', L'', theta'', x'', y'', wx', wy', wz'
SetGeneralizedSpeed( wx, wy, wz )
%--------------------------------------------------------------------
%   Rotational kinematics
B.rotateZ(A,  H)
C.rotateX(B, -L)
D.rotateY(C,  theta)
wdn> = D.getAngularVelocity(A)
Zero[1] = wx - dot(wdn>, cx> )
Zero[2] = wy - dot(wdn>, cy> )
Zero[3] = wz - dot(wdn>, cz> )
SolveDt(Zero, H', L', theta')

%--------------------------------------------------------------------
%   Translational kinematics
Bo.translate(Ao, x*ax> + y*ay> )
Co.translate(Bo, 0> )
Dcm.translate(Bo, r*cz> )
Do.translate(Dcm, 0> )
Da.setPositionVelocity(Dcm, -r*cz> )

Rolling[1] = dot(Da.getVelocity(A), ax>)
Rolling[2] = dot(Da.getVelocity(A), ay>)
SolveDt(Rolling, x', y')
%--------------------------------------------------------------------
%   Mass and inertia properties
D.setMass(m)
D.setInertia(Dcm, J, I, J)

%--------------------------------------------------------------------
%   Add relevant contact and distance forces
System.AddForceGravity( -g*az> )
%--------------------------------------------------------------------
%   Kane's equations of motion
EoM = System.getDynamicsKane()
%--------------------------------------------------------------------
%   Unit system for input/output conversions
SetUnitSystem( kg, meter, sec )
%--------------------------------------------------------------------
%   Integration parameters
Input  tFinal=10 sec, integStp=0.05 sec, absError=1.0E-08, relError=1.0E-08
%--------------------------------------------------------------------
%   Initial values for variables
Input x = 0, y = 0
Input H = 0, theta = 0, L = 10 degrees
Input wx = 0 rad/ sec, wy = 0 rad/ sec, wz = 5 rad/ sec

%--------------------------------------------------------------------
%   Output quantities when ODE command is issued.
Output  t sec, x m, y m, L degrees

%--------------------------------------------------------------------
%   C/Matlab/Fortran code or immediate numerical solution.
ODE(EoM, wx', wy', wz') disk
stop
`;
