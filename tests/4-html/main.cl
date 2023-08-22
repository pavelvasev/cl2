import std="std/std.cl" dom="std/dom/dom.cl"

obj "main" {
  output: cell
  btn: dom.element tag="button"
  std.print "created button, dom elem = " @btn.output
  bind @btn.output @output
}