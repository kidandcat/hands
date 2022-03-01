#include <Keyboard.h>
#include <Mouse.h>
#include <MouseTo.h>

void setup()
{
  Serial.begin(115200);
  Serial.setTimeout(1);
  Keyboard.begin();
  Mouse.begin();
  MouseTo.setCorrectionFactor(1);
}

int x;
int y;

void loop()
{
  while (!Serial.available());
  String command = Serial.readStringUntil('\n');
  if (command.substring(0, 1) == "u")
  { // key press
    Keyboard.press(command[1]);
    return;
  }
  if (command.substring(0, 1) == "y")
  { // key release
    Keyboard.release(command[1]);
    return;
  }
  if (command.substring(0, 1) == "k")
  { // key click
    Keyboard.print(command.substring(1));
    return;
  }
  if (command.substring(0, 1) == "m")
  { // mouse move
    x = command.substring(1, 5).toInt();
    y = command.substring(5, 9).toInt();
    MouseTo.setTarget(x, y);
    while (MouseTo.move() == false) {}
    Serial.print("MOVED to " + String(x) + ", " + String(y) + "\n");
    return;
  }
  if (command.substring(0, 1) == "z")
  { // mouse move relative
    x = command.substring(1, 5).toInt();
    y = command.substring(5, 9).toInt();
    Mouse.move(x, y, 0);
  }
  if (command.substring(0, 1) == "p")
  { // mouse press
    Mouse.press();
    return;
  }
  if (command.substring(0, 1) == "b")
  { // mouse right click
    Mouse.click(MOUSE_RIGHT);
    return;
  }
  if (command.substring(0, 1) == "h")
  { // mouse release
    Mouse.release();
    return;
  }
}
