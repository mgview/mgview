function [t,VAR,Output] = Link
%===========================================================================
% File: Link.m created on Mon Apr 30 2012 by MotionGenesis 5.3.
% Basic Research Licensee: Fidel Hernandez (until October 2012).
% Portions copyright (c) 1988-2012 Paul Mitiguy and 2009-2012 Motion Genesis.
% Paid-up MotionGenesis Basic Research licensees are granted the right
% right to distribute this code for legal academic (non-professional) purposes only,
% provided this copyright notice appears in all copies and distributions.
%===========================================================================
% The software is provided "as is", without warranty of any kind, express or    
% implied, including but not limited to the warranties of merchantability or    
% fitness for a particular purpose. In no event shall the authors, contributors,
% or copyright holders be liable for any claim, damages or other liability,     
% whether in an action of contract, tort, or otherwise, arising from, out of, or
% in connection with the software or the use or other dealings in the software. 
%===========================================================================
dzpp=0; qxpp=0; qypp=0; dzDesired=0; Fz=0; qxDesired=0; qyDesired=0; Tx=0; Ty=0; x=0; y=0; z=0; dzDesiredp=0; qxDesiredp=0; qyDesiredp=0; xp=0; yp=0; zp=0; I=0; J=0; m=0;


%-------------------------------+--------------------------+-------------------+-----------------
% Quantity                      | Value                    | Units             | Description
%-------------------------------|--------------------------|-------------------|-----------------
b                               =  0.01;                   % N*s/m               Constant
bT                              =  0.01;                   % N*m*s/rad           Constant
density                         =  2.7;                    % g/(cm^3)            Constant
kdx                             =  50;                     % N*m*s               Constant
kdy                             =  50;                     % N*m*s               Constant
kdz                             =  70;                     % N*s/m               Constant
kpx                             =  1000;                   % N*m                 Constant
kpy                             =  1000;                   % N*m                 Constant
kpz                             =  500;                    % N/m                 Constant
kT                              =  10;                     % N*m/rad             Constant
lLink                           =  0.5;                    % m                   Constant
lOffset                         =  10;                     % cm                  Constant
palpateAmplitude                =  3;                      % cm                  Constant
palpateDepth                    =  15;                     % cm                  Constant
palpateFrequency                =  0.5;                    % rev/s               Constant
rLink                           =  3;                      % cm                  Constant

dz                              =  0.15;                   % m                   Initial Value
qx                              =  0;                      % deg                 Initial Value
qy                              =  0;                      % deg                 Initial Value
dzp                             =  0;                      % UNITS               Initial Value
qxp                             =  0;                      % UNITS               Initial Value
qyp                             =  0;                      % UNITS               Initial Value

tInitial                        =  0.0;                    % second              Initial Time
tFinal                          =  10;                     % s                   Final Time
integStp                        =  0.001;                  % s                   Integration Step
printIntScreen                  =  1;                      % 0 or +integer       Print-Integer
printIntFile                    =  1;                      % 0 or +integer       Print-Integer
absError                        =  1.0E-05;                %                     Absolute Error
relError                        =  1.0E-08;                %                     Relative Error
%-------------------------------+--------------------------+-------------------+-----------------

% Unit conversions.  UnitSystem: kilogram, meter, second
DEGtoRAD = pi / 180.0;
RADtoDEG = 180.0 / pi;
density = density * 999.9999999999999;
lOffset = lOffset * 0.01;
palpateAmplitude = palpateAmplitude * 0.01;
palpateDepth = palpateDepth * 0.01;
palpateFrequency = palpateFrequency * 6.283185307179586;
rLink = rLink * 0.01;
qx = qx * DEGtoRAD;
qy = qy * DEGtoRAD;

% Evaluate constants
m = pi*density*lLink*rLink^2;
I = 0.5*rLink^2*m;
J = 0.08333333333333333*(lLink^2+3*rLink^2)*m;


VAR = SetMatrixFromNamedQuantities;
[t,VAR,Output] = IntegrateForwardOrBackward( tInitial, tFinal, integStp, absError, relError, VAR, printIntScreen, printIntFile );
OutputToScreenOrFile( [], 0, 0 );   % Close output files



%===========================================================================
function sys = mdlDerivatives( t, VAR, uSimulink )
%===========================================================================
SetNamedQuantitiesFromMatrix( VAR );
% Quantities that were specified
y = 0;
z = -palpateDepth - palpateAmplitude*sin(palpateFrequency*t);
qxDesired = asin(y/sqrt(y^2+z^2));
zp = -palpateAmplitude*palpateFrequency*cos(palpateFrequency*t);
yp = 0;
qxDesiredp = -z*(y*zp-z*yp)/(cos(qxDesired)*(y^2+z^2)^1.5);
Tx = kpx*(qxDesired-qx) + kdx*(qxDesiredp-qxp);
x = 0;
qyDesired = asin(x/sqrt(x^2+y^2+z^2));
xp = 0;
qyDesiredp = ((y^2+z^2)*xp-x*(y*yp+z*zp))/(cos(qyDesired)*(x^2+y^2+z^2)^1.5);
Ty = kpy*(qyDesired-qy) + kdy*(qyDesiredp-qyp);
dzDesired = sqrt(x^2+y^2+z^2);
dzDesiredp = (x*xp+y*yp+z*zp)/sqrt(x^2+y^2+z^2);
Fz = kpz*(dzDesired-dz) + kdz*(dzDesiredp-dzp);

qxpp = -2*(2*kT*qx+2*bT*qxp+12*(I-J)*sin(qy)*cos(qy)*qyp*qxp-2*Tx-6*lLink^2*m*sin(qy)*cos(qy)*qyp*qxp-m*cos(qy)*(lLink-2*dz)*(2*cos(qy)*dzp+sin(qy)*(lLink-2*dz)*qyp)*qxp)/(4*I+12*J+6*lLink^2*m*cos(qy)^2+12*(I-J)*sin(qy)^2+m*cos(qy)^2*(  ...
lLink-2*dz)^2);
qypp = -(4*kT*qy+4*bT*qyp-4*Ty-4*m*(lLink-2*dz)*dzp*qyp-sin(qy)*cos(qy)*(12*I-12*J-6*lLink^2*m-m*(lLink-2*dz)^2)*qxp^2)/(12*J+6*lLink^2*m+m*(lLink-2*dz)^2);
dzpp = (Fz-b*dzp)/m - 0.5*(lLink-2*dz)*(qyp^2+cos(qy)^2*qxp^2);

sys = transpose( SetMatrixOfDerivativesPriorToIntegrationStep );
end



%===========================================================================
function VAR = SetMatrixFromNamedQuantities
%===========================================================================
VAR = zeros(1,6);
VAR(1) = dz;
VAR(2) = qx;
VAR(3) = qy;
VAR(4) = dzp;
VAR(5) = qxp;
VAR(6) = qyp;
end



%===========================================================================
function SetNamedQuantitiesFromMatrix( VAR )
%===========================================================================
dz = VAR(1);
qx = VAR(2);
qy = VAR(3);
dzp = VAR(4);
qxp = VAR(5);
qyp = VAR(6);
end



%===========================================================================
function VARp = SetMatrixOfDerivativesPriorToIntegrationStep
%===========================================================================
VARp = zeros(1,6);
VARp(1) = dzp;
VARp(2) = qxp;
VARp(3) = qyp;
VARp(4) = dzpp;
VARp(5) = qxpp;
VARp(6) = qypp;
end



%===========================================================================
function Output = mdlOutputs( t, VAR, uSimulink )
%===========================================================================
Output = zeros(1,78);
Output(1) = t;
Output(2) = -0.5*lLink*sin(qy);
Output(3) = -0.5*lLink*sin(qx)*cos(qy);
Output(4) = 0.5*lLink*cos(qx)*cos(qy);
Output(5) = cos(qy);
Output(6) = 0.0;
Output(7) = -sin(qy);
Output(8) = -sin(qx)*sin(qy);
Output(9) = cos(qx);
Output(10) = -sin(qx)*cos(qy);
Output(11) = sin(qy)*cos(qx);
Output(12) = sin(qx);
Output(13) = cos(qx)*cos(qy);

Output(14) = t;
Output(15) = 0.5*lLink*(1.0-2.0*sin(qy));
Output(16) = -lLink*sin(qx)*cos(qy);
Output(17) = lLink*cos(qx)*cos(qy);
Output(18) = 1.0;
Output(19) = 0.0;
Output(20) = 0.0;
Output(21) = 0.0;
Output(22) = cos(qx);
Output(23) = -sin(qx);
Output(24) = 0.0;
Output(25) = sin(qx);
Output(26) = cos(qx);

Output(27) = t;
Output(28) = -0.5*lLink*(-2.0+sin(qy));
Output(29) = -0.5*lLink*sin(qx)*cos(qy);
Output(30) = 0.5*lLink*cos(qx)*cos(qy);
Output(31) = cos(qy);
Output(32) = 0.0;
Output(33) = -sin(qy);
Output(34) = -sin(qx)*sin(qy);
Output(35) = cos(qx);
Output(36) = -sin(qx)*cos(qy);
Output(37) = sin(qy)*cos(qx);
Output(38) = sin(qx);
Output(39) = cos(qx)*cos(qy);

Output(40) = t;
Output(41) = lLink-0.5*sin(qy)*(lLink-2.0*dz);
Output(42) = -0.5*sin(qx)*cos(qy)*(lLink-2.0*dz);
Output(43) = 0.5*cos(qx)*cos(qy)*(lLink-2.0*dz);
Output(44) = cos(qy);
Output(45) = 0.0;
Output(46) = -sin(qy);
Output(47) = -sin(qx)*sin(qy);
Output(48) = cos(qx);
Output(49) = -sin(qx)*cos(qy);
Output(50) = sin(qy)*cos(qx);
Output(51) = sin(qx);
Output(52) = cos(qx)*cos(qy);

Output(53) = t;
Output(54) = lOffset-0.5*lLink*sin(qy);
Output(55) = -0.5*lLink*sin(qx)*cos(qy);
Output(56) = 0.5*lLink*cos(qx)*cos(qy);
Output(57) = cos(qy);
Output(58) = 0.0;
Output(59) = -sin(qy);
Output(60) = -sin(qx)*sin(qy);
Output(61) = cos(qx);
Output(62) = -sin(qx)*cos(qy);
Output(63) = sin(qy)*cos(qx);
Output(64) = sin(qx);
Output(65) = cos(qx)*cos(qy);

Output(66) = t;
Output(67) = 0.5*lLink-(lLink-lOffset)*sin(qy);
Output(68) = -(lLink-lOffset)*sin(qx)*cos(qy);
Output(69) = (lLink-lOffset)*cos(qx)*cos(qy);
Output(70) = 1.0;
Output(71) = 0.0;
Output(72) = 0.0;
Output(73) = 0.0;
Output(74) = cos(qx);
Output(75) = -sin(qx);
Output(76) = 0.0;
Output(77) = sin(qx);
Output(78) = cos(qx);
end


%===========================================================================
function OutputToScreenOrFile( Output, shouldPrintToScreen, shouldPrintToFile )
%===========================================================================
persistent FileIdentifier hasHeaderInformationBeenWritten;

if( isempty(Output) ),
   if( ~isempty(FileIdentifier) ),
      for( i = 1 : 6 ),  fclose( FileIdentifier(i) );  end
      clear FileIdentifier;
      fprintf( 1, '\n Output is in the files Link.i  (i=1, ..., 6)\n' );
      fprintf( 1, '\n Note: Plots are automatically generated by issuing the OutputPlot command in MotionGenesis\n' );
      fprintf( 1, '\n To load and plot columns 1 and 2 with a solid line and columns 1 and 3 with a dashed line, enter:\n' );
      fprintf( 1, '    someName = load( ''Link.1'' );\n' );
      fprintf( 1, '    plot( someName(:,1), someName(:,2), ''-'', someName(:,1), someName(:,3), ''--'' )\n\n' );
   end
   clear hasHeaderInformationBeenWritten;
   return;
end

if( isempty(hasHeaderInformationBeenWritten) ),
   if( shouldPrintToScreen ),
      fprintf( 1,                '%%       t         P_No_Bo[1]     P_No_Bo[2]     P_No_Bo[3]      N_B[1,1]       N_B[1,2]       N_B[1,3]       N_B[2,1]       N_B[2,2]       N_B[2,3]       N_B[3,1]       N_B[3,2]       N_B[3,3]\n' );
      fprintf( 1,                '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
   end
   if( shouldPrintToFile && isempty(FileIdentifier) ),
      FileIdentifier = zeros(1,6);
      FileIdentifier(1) = fopen('Link.1', 'wt');   if( FileIdentifier(1) == -1 ), error('Error: unable to open file Link.1'); end
      fprintf(FileIdentifier(1), '%% FILE: Link.1\n%%\n' );
      fprintf(FileIdentifier(1), '%%       t         P_No_Bo[1]     P_No_Bo[2]     P_No_Bo[3]      N_B[1,1]       N_B[1,2]       N_B[1,3]       N_B[2,1]       N_B[2,2]       N_B[2,3]       N_B[3,1]       N_B[3,2]       N_B[3,3]\n' );
      fprintf(FileIdentifier(1), '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
      FileIdentifier(2) = fopen('Link.2', 'wt');   if( FileIdentifier(2) == -1 ), error('Error: unable to open file Link.2'); end
      fprintf(FileIdentifier(2), '%% FILE: Link.2\n%%\n' );
      fprintf(FileIdentifier(2), '%%       t         P_No_Co[1]     P_No_Co[2]     P_No_Co[3]      N_C[1,1]       N_C[1,2]       N_C[1,3]       N_C[2,1]       N_C[2,2]       N_C[2,3]       N_C[3,1]       N_C[3,2]       N_C[3,3]\n' );
      fprintf(FileIdentifier(2), '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
      FileIdentifier(3) = fopen('Link.3', 'wt');   if( FileIdentifier(3) == -1 ), error('Error: unable to open file Link.3'); end
      fprintf(FileIdentifier(3), '%% FILE: Link.3\n%%\n' );
      fprintf(FileIdentifier(3), '%%       t         P_No_Do[1]     P_No_Do[2]     P_No_Do[3]      N_D[1,1]       N_D[1,2]       N_D[1,3]       N_D[2,1]       N_D[2,2]       N_D[2,3]       N_D[3,1]       N_D[3,2]       N_D[3,3]\n' );
      fprintf(FileIdentifier(3), '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
      FileIdentifier(4) = fopen('Link.4', 'wt');   if( FileIdentifier(4) == -1 ), error('Error: unable to open file Link.4'); end
      fprintf(FileIdentifier(4), '%% FILE: Link.4\n%%\n' );
      fprintf(FileIdentifier(4), '%%       t         P_No_Eo[1]     P_No_Eo[2]     P_No_Eo[3]      N_E[1,1]       N_E[1,2]       N_E[1,3]       N_E[2,1]       N_E[2,2]       N_E[2,3]       N_E[3,1]       N_E[3,2]       N_E[3,3]\n' );
      fprintf(FileIdentifier(4), '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
      FileIdentifier(5) = fopen('Link.5', 'wt');   if( FileIdentifier(5) == -1 ), error('Error: unable to open file Link.5'); end
      fprintf(FileIdentifier(5), '%% FILE: Link.5\n%%\n' );
      fprintf(FileIdentifier(5), '%%       t         P_No_Fo[1]     P_No_Fo[2]     P_No_Fo[3]      N_F[1,1]       N_F[1,2]       N_F[1,3]       N_F[2,1]       N_F[2,2]       N_F[2,3]       N_F[3,1]       N_F[3,2]       N_F[3,3]\n' );
      fprintf(FileIdentifier(5), '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
      FileIdentifier(6) = fopen('Link.6', 'wt');   if( FileIdentifier(6) == -1 ), error('Error: unable to open file Link.6'); end
      fprintf(FileIdentifier(6), '%% FILE: Link.6\n%%\n' );
      fprintf(FileIdentifier(6), '%%       t         P_No_Go[1]     P_No_Go[2]     P_No_Go[3]      N_G[1,1]       N_G[1,2]       N_G[1,3]       N_G[2,1]       N_G[2,2]       N_G[2,3]       N_G[3,1]       N_G[3,2]       N_G[3,3]\n' );
      fprintf(FileIdentifier(6), '%%   (second)        (meter)        (meter)        (meter)       (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)      (NoUnits)\n\n' );
   end
   hasHeaderInformationBeenWritten = 1;
end

if( shouldPrintToScreen ), WriteNumericalData( 1,                 Output(1:13) );  end
if( shouldPrintToFile ),   WriteNumericalData( FileIdentifier(1), Output(1:13) );  end
if( shouldPrintToFile ),   WriteNumericalData( FileIdentifier(2), Output(14:26) );  end
if( shouldPrintToFile ),   WriteNumericalData( FileIdentifier(3), Output(27:39) );  end
if( shouldPrintToFile ),   WriteNumericalData( FileIdentifier(4), Output(40:52) );  end
if( shouldPrintToFile ),   WriteNumericalData( FileIdentifier(5), Output(53:65) );  end
if( shouldPrintToFile ),   WriteNumericalData( FileIdentifier(6), Output(66:78) );  end
end


%===========================================================================
function WriteNumericalData( fileIdentifier, Output )
%===========================================================================
numberOfOutputQuantities = length( Output );
if( numberOfOutputQuantities > 0 ),
   for( i = 1 : numberOfOutputQuantities ),
      fprintf( fileIdentifier, ' %- 14.6E', Output(i) );
   end
   fprintf( fileIdentifier, '\n' );
end
end



%===========================================================================
function [functionsToEvaluateForEvent, eventTerminatesIntegration1Otherwise0, eventDirection_AscendingIs1_CrossingIs0_DescendingIsNegative1] = EventDetection( t, VAR, uSimulink )
%===========================================================================
% Detects when designated functions are zero or cross zero with positive or negative slope.
% Step 1: Uncomment call to mdlDerivatives if need current values of quantities other than t, VAR, or uSimulink.
% Step 2: Change functionsToEvaluateForEvent,            e.g., change  []  to  [t - 5.67]  to stop at t = 5.67.
% Step 3: Change eventTerminatesIntegration1Otherwise0,  e.g., change  []  to  [1]  to stop integrating.
% Step 4: Change eventDirection_AscendingIs1_CrossingIs0_DescendingIsNegative1,  e.g., change  []  to  [1].

% mdlDerivatives( t, VAR, uSimulink );
functionsToEvaluateForEvent = [];
eventTerminatesIntegration1Otherwise0 = [];
eventDirection_AscendingIs1_CrossingIs0_DescendingIsNegative1 = [];
end



%===========================================================================
function [t,VAR,Output] = IntegrateForwardOrBackward( tInitial, tFinal, integStp, absError, relError, VAR, printIntScreen, printIntFile )
%===========================================================================
OdeMatlabOptions = odeset( 'RelTol',relError, 'AbsTol',absError, 'MaxStep',integStp, 'Events',@EventDetection );
t = tInitial;
mdlDerivatives( t, VAR, 0 );
printCounterScreen = 0;
printCounterFile   = 0;
isIntegrationFinished = 0;
while 1,
   if( (tFinal >= tInitial && t+0.01*integStp >= tFinal) || (tFinal <= tInitial && t+0.01*integStp <= tFinal) ), isIntegrationFinished = 1;  end
   shouldPrintToScreen = printIntScreen && ( isIntegrationFinished || printCounterScreen <= 0.01 );
   shouldPrintToFile   = printIntFile   && ( isIntegrationFinished || printCounterFile   <= 0.01 );
   if( isIntegrationFinished || shouldPrintToScreen || shouldPrintToFile ),
      Output = mdlOutputs( t, VAR, 0 );
      OutputToScreenOrFile( Output, shouldPrintToScreen, shouldPrintToFile );
      if( isIntegrationFinished ), break;  end
      if( shouldPrintToScreen ), printCounterScreen = printIntScreen;  end
      if( shouldPrintToFile ),   printCounterFile   = printIntFile;    end
   end
   tAtEndOfIntegrationStep = t + integStp;
   [TimeOdeArray, VarOdeArray, timeEventOccurredInIntegrationStep, nStatesArraysAtEvent, nIndexOfEvents] = ode45( @mdlDerivatives, [t tAtEndOfIntegrationStep], VAR, OdeMatlabOptions, 0 );
   t = TimeOdeArray( length(TimeOdeArray) );
   VAR = VarOdeArray( length(TimeOdeArray), : );
   printCounterScreen = printCounterScreen - 1;
   printCounterFile   = printCounterFile   - 1;
   if( ~isempty(timeEventOccurredInIntegrationStep) ), isIntegrationFinished = 1;
   elseif( abs(tAtEndOfIntegrationStep - t) >= abs(0.001*integStp) ), warning('numerical integration failed'); break;  end
end
end


%====================================
end   % End of embedded function Link
%====================================
