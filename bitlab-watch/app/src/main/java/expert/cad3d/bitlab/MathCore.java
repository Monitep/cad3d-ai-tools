package expert.cad3d.bitlab;

public final class MathCore {
    public static final int LIMIT = 65535;
    private MathCore() {}
    public static int parse(String text, int base) {
        if (text == null || text.isEmpty() || !(base == 2 ? text.matches("[01]{1,16}") : text.matches("[0-9]{1,5}"))) throw new IllegalArgumentException("Numero non valido");
        int n = Integer.parseInt(text, base);
        if (n > LIMIT) throw new IllegalArgumentException("Massimo 65535");
        return n;
    }
    public static String binary(long n) { return Long.toBinaryString(n); }
    public static String calculate(int a, int b, String op) {
        switch (op) {
            case "+": return binary((long)a+b);
            case "−": if(a<b) throw new IllegalArgumentException("Il primo numero deve essere maggiore o uguale al secondo"); return binary(a-b);
            case "×": return binary((long)a*b);
            case "÷": if(b==0) throw new IllegalArgumentException("Non si può dividere per zero"); return binary(a/b)+" resto "+binary(a%b);
            default: throw new IllegalArgumentException("Operazione non valida");
        }
    }
}
