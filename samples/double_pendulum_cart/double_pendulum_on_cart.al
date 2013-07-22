NewtonianFrame N
Particle       A        % Cart
RigidBody      B, C     % Two pendulums
Point          BC       % Pin-joint Point connecting B and C
Variable       xA'      % Differential equation governs xA
%--------------------------------
 %   Rotational kinematics
 B.SetRotationMatrixZ( N, t )

 C.SetRotationMatrixZ( B, 2*t )

 %--------------------------------
 %   Translational kinematics
 xA' = exp(sin(t));      % Actuator connects A to No

 A.SetPosition( No, xA*Nx> )
 
 Bo.SetPosition( A, -0.5*By> )
 
 BC.SetPosition( A, -By> )
 
 Co.SetPosition( BC, -0.5*Cy> )
 
 %--------------------------------
 Animate( N, No, A,B,C )
 
 Input xA = 0.234, tFinal=15.0, integStep=0.02
 
 outputplot t, xA
 ODE() double_pendulum_on_cart
