// Keep in sync with mgviewSimTemplate.txt (Vite ?raw import is build-only).
export const MGVIEW_SIM_TEMPLATE = `% MGView starter model: simple pendulum
NewtonianFrame N
RigidBody A

variable qA''
constant L, m, g, Ia

A.setMass(m)
A.setInertia(Acm, Ia, 0, 0)
A.rotateX(N, qA)
Acm.translate(No, -L*az>)

System.AddForceGravity(-g*nz>)
EoM> = System.getDynamics(No)
EoM = dot(EoM>, nx>)
solve(EoM, qA'')

input g = 9.81 m/sec^2
input L = 1 m
input m = 1 kg
input Ia = 0.1 kg*m^2
input qA' = 0
input integStp = 0.02, tFinal = 10, absError = 1e-5

output t, qA deg
animate(N, No, A)

input qA = 30 degrees
ODE() Data

quit
`;
