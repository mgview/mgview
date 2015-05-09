%     File: VehicleTricycle.al
%  Problem: Analysis of three-wheel vehicle (tricycle)
%--------------------------------------------------------------------
%       Physical objects
NewtonianFrame  N            % Newtonian reference frame (ground)
RigidBody       A            % Vehicle chassis (Ao is center of axle)
RigidBody       B, C         % Rear wheels of vehicle
RigidFrame      E            % Front fork
RigidBody       F            % Front wheel
Point           BN( B )      % Point of B in contact with N
Point           CN( C )      % Point of C in contact with N
Point           FN( F )      % Point of F in contact with N
Point           Scm( A )     % System mass center (fixed on A)
%--------------------------------------------------------------------
%       Variables, constants, and specified
Variable  v'                 % Ax> measure number of velocity of Ao in N
Variable  qA''               % Az> rotation of A in N (vehicle heading angle)
Variable  wB'                % Ay> measure of angular velocity of B in A
Variable  wC'                % Ay> measure of angular velocity of B in A
Variable  qE''               % Az> rotation of E in N (steering)
Variable  wF'                % Ey> measure of angular velocity of F in E
Constant  b = 0.75 m         % Distance between Ao and Bcm (or Ao and Ccm)
Constant  R = 0.35 m         % Radius of wheels
Constant  e = 2.0  m         % Distance between Ao and Fcm
Constant  a = 1.64 m         % Ax> measure of Acm's position vector from Ao 
Constant  h = 0.20 m         % Az> measure of Acm's position vector from Ao
Constant  g = 9.8  m/s^2     % Earth's gravitational acceleration
Constant  theta = 15 deg     % Road grade (i.e., hill angle)
Variable  TB                 % Breaking or driving torque on B from A
Variable  TSteer             % Steering torque on F from A
SetGeneralizedSpeed( v, qE' )
%--------------------------------------------------------------------
%       Mass and inertia
A.SetMass( mA = 640 kg)
B.SetMass(  m =  30 kg )
C.SetMass(  m )
F.SetMass(  m )
A.SetInertia( Acm, IAxx, IAyy, IAzz = 166.6 kg*m^2 )       % Relevant inertia properties of body A
B.SetInertia( Bcm, A, K = 1.0 kg*m^2, J = 2.0 kg*m^2, K )  % B's inertia expressed in A basis
C.SetInertia( Ccm, A, K, J, K )                            % C's inertia expressed in A basis
F.SetInertia( Fcm, E, K, J, K )                            % E's Inertia expressed in A basis
%--------------------------------------------------------------------
%       Rotational kinematics
A.RotateZ( N, qA )       
B.SetAngularVelocityAcceleration( A, wB*Ay> )
C.SetAngularVelocityAcceleration( A, wC*Ay> )
E.RotateNegativeZ( A, qE )
F.SetAngularVelocityAcceleration( E, wF*Ey> )
%--------------------------------------------------------------------
%       Translational kinematics
Ao.SetVelocityAcceleration( N,  v*Ax> )
Acm.Translate( Ao,  a*Ax> + h*Az> )  
Bcm.Translate( Ao, -b*Ay> )  
Ccm.Translate( Ao,  b*Ay> )  
Fcm.Translate( Ao,  e*Ax> )  
BN.Translate( Bcm, -R*Az> )  
CN.Translate( Ccm, -R*Az> )  
FN.Translate( Fcm, -R*Az> )  
Eo.SetPosition( Ao, E*ax> + h*Az> ) 
%--------------------------------------------------------------------
%       Position, velocity, and acceleration of system center of mass.
p_Ao_Scm> = System.GetCMPosition( Ao ) 
sx = Dot( p_Ao_Scm>, Ax> )               % Introduce new symbol
sz = Dot( p_Ao_Scm>, Az> )               % Introduce new symbol
Scm.Translate( Ao,  sx*Ax> + sz*Az> )
%--------------------------------------------------------------------
%       Motion constraints (relate qA', wB, wC, wF to w and v)
Rolling[1] = Dot( BN.GetVelocity(N), Ax> )
Rolling[2] = Dot( CN.GetVelocity(N), Ax> )
Rolling[3] = Dot( FN.GetVelocity(N), Ex> )
Rolling[4] = Dot( FN.GetVelocity(N), Ey> )
SolveDt( Rolling, qA', wB, wC, wF )
%--------------------------------------------------------------------
%       Replace all gravity forces with single force at Scm
% Note: This only works since no road-maps for A, B, C, F require separate gravity forces.
mTotal = System.GetMass()
gravityDirection> = sin(theta)*Nx> - cos(theta)*Nz>
Scm.AddForce( mTotal * g * gravityDirection> )
%--------------------------------------------------------------------
%       Relevant torques
B.AddTorque( A,  TB*Ay> )
E.AddTorque( A, -TSteer*Az> )
%--------------------------------------------------------------------
%       Kane's equations for statics - with simplification
ZeroStatics = System.GetStaticsKane()
ZeroStatics[1] *= R*cos(qE)               % Helps simplification
Expand( ZeroStatics )
Factor( ZeroStatics, g, TB )
StaticTorques = Solve( ZeroStatics, TB, TSteer )
StaticTorquesToPlot = EvaluateAtInput( StaticTorques,  qA = 0 degrees )
%--------------------------------------------------------------------
%       Kane's equations of motion - with simplification
Zero = System.GetDynamicsKane()
FactorQuadratic( Zero, v', v, qE'', qE',  wB, wC, wF, qA' )
%--------------------------------------------------------------------
%       Output point Ao's position from point No
Variable x' = Dot( Ao.GetVelocity(N), Nx> )
Variable y' = Dot( Ao.GetVelocity(N), Ny> )
Ao.SetPosition( No, x*Nx> + y*Ny> )
%--------------------------------------------------------------------
%       Output total mechanical energy (may be conserved)
KE = System.GetKineticEnergy() 
PE = mTotal*g*Dot( Scm.GetPosition(No), -gravityDirection> )
MechanicalEnergy = KE + PE
%--------------------------------------------------------------------
%       Integration parameters 
Input  tFinal = 9 sec,  integStp = 0.002 sec,  absError = 1.0E-07
%--------------------------------------------------------------------
%       Initial values for variables (released from rest with No and Ao initially coincident)
Input  qA = 0 deg,   qE = 0 deg,  qE' = 0 rad/sec,  v = 0 m/s,  x = 0 m,  y = 0 m  
%--------------------------------------------------------------------
%       List quantities to be output by ODE command.
%Output  t sec,  qA deg,  qE deg,  x m,  y m,  x' m/s,  y' m/s,  TB N*m,  TSteer N*m
%Output  t sec,  v rad/sec,  qA' rad/sec,  wB rad/sec,  wC rad/sec,  qE' rad/sec,  wF rad/sec
%--------------------------------------------------------------------
%       Desired motion 
Constant   accelDesired = 15 km/hour/sec,  desiredSteeringAngle = 5 deg
Specified  vDesired',  qEDesired''
SetDt( vDesired = accelDesired*t )
SetDt( qEDesired = desiredSteeringAngle )
%--------------------------------------------------------------------
%       Error in motion 
vError = v - vDesired
qEError = qE - qEDesired
%--------------------------------------------------------------------
%       Feed-forward control for TB and TSteer
Constant   kp = 1 rad/sec,   zeta = 1 noUnits,  wn = 1 rad/sec
Controller[1] = Dt( vError ) + kp*vError
Controller[2] = DtDt( qEError ) + 2*zeta*wn*Dt( qEError ) + wn^2*qEError
%--------------------------------------------------------------------
%       Simulation of controller
% OutputPlot  x meters, y meters
% ODE( [Zero; Controller],  v', qE'', TB, TSteer ) VehicleTricycleFeedForward
%--------------------------------------------------------------------
%       Dynamic simulation with no breaking or steering and small steering perturbation
Input  tFinal := 7 sec,  qE := 0.1 deg
TB = 0;  TSteer = 0
% OutputPlot  t sec,  qA deg,  qE deg
% ODE( Zero,  v', qE'' ) VehicleTricycleFreeMotionForward
%--------------------------------------------------------------------
Input  qA := 180 deg         
% OutputPlot  t sec,  qA deg,  qE deg
% ODE( Zero,  v', qE'' ) VehicleTricycleFreeMotionBackward

%--------------------------------------------------------------------
%       Equations via Newton/Euler for motion simulation only
Variable  FBx, FCx, FFx, FFy,               % Should appear in all road-maps.
Variable  FBz, FCz, FFz                     % Should appear in road-maps for normal forces.
Variable  FBy, FCy                          % Should not appear in any road-maps.
BN.AddForce( FBx*Ax> + FBy*Ay> + FBz*Az> )  
CN.AddForce( FCx*Ax> + FCy*Ay> + FCz*Az> )  
FN.AddForce( FFx*Ex> + FFy*Ey> + FFz*Ez> ) 
RoadMap[1] = Dot( Ax>,  System.GetDynamics() )
RoadMap[2] = Dot( Ez>,       E.GetDynamics(Eo) + F.GetDynamics(Eo) )
RoadMap[3] = Dot( Ay>,       B.GetDynamics(Bcm) )
RoadMap[4] = Dot( Ay>,       C.GetDynamics(Ccm) )
RoadMap[5] = Dot( Ey>,       F.GetDynamics(Fcm) )
RoadMap[6] = Dot( Az>,  System.GetDynamics(Ao)  )
ShouldBeZeroA = GetCoefficient( RoadMap, FBy, FBz, FCy, FCz, FFz )
FactorLinear( RoadMap,  v', qE'', FBx, FCx, FFx, FFy )
% ODE( RoadMap,  v', qE'', FBx, FCx, FFx, FFy ) VehicleTricycleFreeMotionBackward
%--------------------------------------------------------------------
%       Extra equations via Newton/Euler for normal/friction forces
RoadMap[7] = Dot( Ay>,  System.GetDynamics(Ao)  )
RoadMap[8] = Dot( Ax>,  System.GetDynamics(BN)  )
RoadMap[9] = Dot( Az>,  System.GetDynamics()    )
ShouldBeZeroB = GetCoefficient( RoadMap, FBy, FCy )
FactorLinear( RoadMap,  v', qE'', FBx, FBz, FCx, FCz, FFx, FFy, FFz )
OutputPlot  t sec,  qA deg,  qE deg
%,  v m/s,  x m, y m
%OutputPlot  t sec,  qA deg,  qE deg,  v m/s,  x m, y m,  MechanicalEnergy Joules,  FBz N,  FCz N,  FFx N,  FFy N,  FFz N,  sqrt(FFx^2+FFy^2)/FFz noUnits










variable thetaB' = wB
variable thetaC' = wC
variable thetaF' = wF
B.SetRotationMatrix(A, Ay>, thetaB)
C.SetRotationMatrix(A, Ay>, thetaC)
F.SetRotationMatrix(E, Ey>, thetaF)

animate(N, No)











ODE( RoadMap,  v', qE'', FBx, FBz, FCx, FCz, FFx, FFy, FFz ) VehicleTricycleFreeMotionBackwardForces
%--------------------------------------------------------------------
%       Save input together with program responses
Save  VehicleTricycle.all
Quit
