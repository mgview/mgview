% Rigid Bodies and Frames
NewtonianFrame A
RigidBody B
RigidFrame C
Point Ba(B), Ab(A)

% Variables and constants
Constant Rb, Ra, m, g, I

Variable wx', wy', wz', z'', theta'', Fx, Fy, Fz, e0', e1', e2', e3'

% Set Mass
B.SetMass(m)

% Set Inertia
I = 0.4*m*Rb^2
B.SetInertia(Bcm, I*1>>)

% Set Rotation
C.RotateZ(A, theta)
B.SetAngularVelocityAcceleration(A, wx*Cx> + wy*Cy> + wz*Cz>)
% for animation
B.SetRotationMatrixODE(A, EulerParameters, e0, e1, e2, e3)

% Translations and Velocities
Bcm.Translate(Ao, -(Ra - Rb)*Cy> + z*Cz>)
% for animation
Bo.Translate(Bcm, 0>)
Ba.Translate(Bcm, -Rb*Cy>)
Ab.Translate(Ao, -Ra*Cy> + z* Cz>)

% Add forces
System.AddForceGravity(-g*Az>)
Ba.addForce(Ab, Fx*cx> + Fy*cy> + Fz*cz>)
notKane> = System.getDynamics()
notKane[1] = Dot(notKane>, cx>)
notKane[2] = Dot(notKane>, cy>)
notKane[3] = Dot(notKane>, cz>)

Solve(notKane, Fx, Fy, Fz)

% Constraints
RollingConstraint[1] = Dot(v_Ba_A>, Cx>)
RollingConstraint[2] = Dot(v_Ba_A>, Cz>)
SolveDt(RollingConstraint, theta', z')

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
SetGeneralizedSpeed(wx, wy, wz)

kane = System.GetDynamicsKane()
solve(kane, wx', wy', wz')

Etot = System.GetKineticEnergy() + System.GetForceGravityPotentialEnergy(-g*az>, Ao)

x = Dot(Bcm.getPosition(Ao), ax>)

Input theta = 0 deg, z = 0 m, m = 500 kg
Input Rb = .0127 m, Ra = 5 in, e0 = 1, e1 = 0, e2 = 0, e3 = 0
Input wx = 0 rad/s, wy = 0 rad/s, wz = 125 rad/s, g = 9.81 m/s^2
Input tFinal = 15 sec, integStp = .01 
PlotOutput t sec, z m
PlotOutput x m, z m
PlotOutput t sec, wx rad/s, wy rad/s, wz rad/s
PlotOutput t sec, Etot J
PlotOutput t sec, Fx N, Fy N, Fz N
Output t sec, wx rad/s, wy rad/s, wz rad/s, z m, z' m/s, theta, theta', Etot J, Fx N, Fy N, Fz N

animate(A, Ao, B)
ODE() me331bmipsi

ODE() me331bmipsi.m