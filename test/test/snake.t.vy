# tiny extra test to ensure snek works with multiple contracts

interface Snek:
    def make(typename: String[32], objectname: String[32], args: Bytes[3200]) -> address: nonpayable
    def echo(target: address): nonpayable
    def rand(set: uint256) -> uint256: nonpayable

interface Snake:
    def grow(): nonpayable
    def size() -> uint256: view

sean: public(Snake)
snek: public(Snek)

@external
def __init__(_snek: Snek):
    size: uint256 = 10
    args: Bytes[32] = _abi_encode(size)
    self.snek = _snek
    self.sean = Snake(self.snek.make('Snake', 'snake1', args))

@external
def test_grow():
    self.sean.grow()
    assert self.sean.size() == 11, 'unexpected size after grow'
