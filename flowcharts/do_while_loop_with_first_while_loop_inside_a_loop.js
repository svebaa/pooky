function do_while_loop_with_first_while_loop_inside_a_loop(){
  var state = 1;
  for (; state !== 99; ) {
    switch (state) {
      case 1:
        state = 2;
        break;
      case 2:
        state = 21;
        break;

      case 21:
        state = !0 ? 22 : 7;
        break;

      case 22:
        state = 3;
        break;

      case 3:
        state = !0 ? 31 : 4;
        break;

      case 31:
        state = 32;
        break;
        
      case 32:
        state = 33;
        break;

      case 33:
        state = 3;
        break;

      case 4:
        state = 5;
        break;


      case 5:
        state = 6;
        break;

      case 6:
        state = !0 ? 3 : 60;
        break;

      case 60:
        state = 61;
        break;

      case 61:
        state = 7
        break;

      case 7:
        state = 8;
        break;

      case 8:
        return !0;
        break;
    }
  }
}