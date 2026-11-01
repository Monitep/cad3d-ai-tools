import expert.cad3d.bitlab.MathCore;
public class MathCoreTest {
 static void eq(Object a,Object b){if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 static void bad(Runnable r){try{r.run();throw new AssertionError("expected error");}catch(IllegalArgumentException expected){}}
 public static void main(String[] args){
  for(int n=0;n<=65535;n++)eq(MathCore.parse(MathCore.binary(n),2),n);
  eq(MathCore.parse("000101",2),5);eq(MathCore.parse("65535",10),65535);
  eq(MathCore.calculate(11,6,"+"),"10001");eq(MathCore.calculate(11,6,"−"),"101");eq(MathCore.calculate(11,6,"×"),"1000010");eq(MathCore.calculate(11,6,"÷"),"1 resto 101");
  bad(()->MathCore.parse("102",2));bad(()->MathCore.parse("65536",10));bad(()->MathCore.calculate(0,1,"−"));bad(()->MathCore.calculate(1,0,"÷"));System.out.println("Tutti i 65536 valori e operazioni superano i controlli.");
 }
}
