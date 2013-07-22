% Kinematics, Statics, and SImulation for Wooden Haptic Device

NewtonianFrame N
RigidBody A,B,C
Point Q(C)

%variable q1'', q2'', q3''
variable qA'', qB'', qC''
constant Ln, Lb, Lc
constant Lb_cm, Lc_cm
constant mA, mB, mC
constant I, g

% Set link mass and inertia
A.setMass(mA)
B.setMass(mB)
C.setMass(mC)
A.setInertia(Acm, I*1>>)
B.setInertia(Bcm, I*1>>)
C.setInertia(Ccm, I*1>>)

% Rotational Kinematics

A.rotateZ(N, qA)
B.rotateY(A, qB)
C.rotateY(B, qC)

% Translational Kinematics
Ao.translate(No,Ln*Nz>)
Acm.translate(Ao, 0>)
Bo.translate(Ao, 0>)
Bcm.translate(Bo, Lb_cm*bz>)
Co.translate(Bo, Lb*bz> + 0.01865*by>)
Ccm.translate(Co, Lc_cm*cx>)
Q.translate(Co, Lc*Cx> - 0.01465*by>)

%setDt(qA = q1)
%setDt(qB = q2)
%setDt(qC = q3 - q2)


% Gravity Force
gravity> = -g*Nz>
System.addForceGravity( gravity> )

% Static gravity compensation
Tau_grav_comp[1] = -dot(Az>, system.getStatics(Ao))
Tau_grav_comp[2] = -dot(By>, system.getStatics(Bo))
Tau_grav_comp[3] = -dot(Cy>, C.getStatics(Co))

Point P
P.translate(No, Ln*Nz> + 1*Lb*Nx> + Lb/6*cos(2*pi*t/5)*Nz> + Lb/2*sin(2*pi*t/5)*Ny>)

% Forward kinematics
fk[1] = dot(Q.getPosition(No), Nx>) 
fk[2] = dot(Q.getPosition(No), Ny>) 
fk[3] = dot(Q.getPosition(No), Nz>)

% Jacobian (row,column)
%jac123 = D(fk, [q1, q2, q3] )
jacABC = D(fk, [qA, qB, qC] )

Gain = 60
VirtualForceAtQ> = -Q.GetPosition(P)*Gain
VirtualForceAtQ[1] = dot(VirtualForceAtQ>,Nx>)
VirtualForceAtQ[2] = dot(VirtualForceAtQ>,Ny>)
VirtualForceAtQ[3] = dot(VirtualForceAtQ>,Nz>)
Tau_virtual = GetTranspose(jacABC)*VirtualForceAtQ

b = 1
Tau_damping[1] = -b*dot(A.getAngularVelocity(N), Az>)
Tau_damping[2] = -b*dot(B.getAngularVelocity(A), By>)
Tau_damping[3] = -b*dot(C.getAngularVelocity(B), Cy>)

Tau_net = Tau_grav_comp + Tau_virtual + Tau_damping

Ta> = Tau_net[1]*Az>
Tb> = Tau_net[2]*By>
Tc> = Tau_net[3]*Cy>

A.addTorque(N, Ta>)
B.addTorque(A, Tb>)
C.addTorque(B, Tc>)

Variable WorkA' = dot(Ta>, A.getAngularVelocity(N))
Variable WorkB' = dot(Tb>, B.getAngularVelocity(A))
Variable WorkC' = dot(Tc>, C.getAngularVelocity(B))
KE = System.getKineticEnergy() 
PE = System.GetForceGravityPotentialEnergy(gravity>, Ao)
MechanicalEnergy = KE + PE - WorkA - WorkB - WorkC 

Zero[1] = dot(System.GetDynamics(Ao), Nz>)
Zero[2] = dot(B.GetDynamics(Bo) + C.GetDynamics(Bo), By>)
Zero[3] = dot(C.GetDynamics(Co), Cy>)
SetAutoZee(ON)
solve(Zero, qA'', qB'', qC'')
%pause

Ln = 0.1
Lb = 0.205
Lc = 0.21
Lb_cm = Ln/4
Lc_cm = Lc/2

input tFinal = 10, integStp = 0.015, absError=1E-6
input mA = 0.2, mB = 20, mC = 20
input I = 0.005
input qA = -1, qB = 0, qC = 0
input qA' = 0, qB' = 0, qC' = 0 
input WorkA = 0, WorkB = 0, WorkC = 0
input g = 9.81 m/sec^2

output t, qA, qB, qC, MechanicalEnergy
animate(N, No, A, B, C, Q, P)

%ODE(Zero, qA'', qB'', qC'') wooden_phantom
ODE() wooden_phantom