// F-COMPILER-LANG

% func "some" {:
  return "privet"
:}

% {
 a:= 5
}
% some @a

process "alfa" {
  in {
    input: cell
  }
}

alfa 5