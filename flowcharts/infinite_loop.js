function infinite_loop(){
  var state = 1;
  for (; state !== 99; ) {
    switch (state) {
      case 1:
        state = 2;
        break;
      case 2:
        state = 3;
        break;

      case 3:
        state = !0 ? 4 : 5;
        break;

      case 4:
        state = 41;
        break;

      case 41:
        state = 42;
        break;

      case 42:
        state = 6;
        break;

      case 5:
        state = 51;
        break;

      case 51:
        state = 52;
        break;

      case 52:
        state = 6;
        break;

      case 6:
        state = 3
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