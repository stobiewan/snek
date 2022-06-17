const fs = require('fs')
const { want, send } = require('minihat');
const dpack = require('@etherpacks/dpack')
const ethers = require('ethers');
const ganache = require("ganache")
const vyper = require('../../src/vyper.js');

const dir = `${__dirname}/SnekTest`
const gas_limit = 3_100_000_000
let snek
let multifab
let signer

describe('test snek', function() {
    this.timeout(10000) // make an object test is slow
    before(async() => {
        vyper.compile('snek.vy', dir, 'Snek')
        const provider = new ethers.providers.Web3Provider(ganache.provider({gasLimit: gas_limit}))
        signer = provider.getSigner()
        const multifab_pack = require('../../lib/multifab/pack/multifab_full_hardhat.dpack.json')
        const dapp = await dpack.load(multifab_pack, ethers, signer)
        multifab = await dapp._types.Multifab.deploy()

        const snek_output = require(`${dir}/SnekOutput.json`)
        const snek_contract = Object.values(snek_output.contracts)[0]['snek']
        const snek_factory = new ethers.ContractFactory(new ethers.utils.Interface(snek_contract.abi),
                                                    snek_contract.evm.bytecode.object, signer)

        snek = await snek_factory.deploy(multifab.address)

    })

    it('should bind hash correctly', async() => {
        const test_type = "test_type"
        const test_hash = ethers.utils.formatBytes32String("testhash")
        await snek._bind(test_type, test_hash)
        want(await snek.types(test_type)).to.eql(test_hash)
    })

    it('should be able to make an object', async() => {
        vyper.compile('test/src/blind_auction.vy', dir, 'BlindAuction')
        const blind_auction_output = require(`${dir}/BlindAuctionOutput.json`)
        const blind_auction_contract = Object.values(blind_auction_output.contracts)[0]['blind_auction']
        const cache_tx = await send(multifab.cache, blind_auction_contract.evm.bytecode.object);
        console.log(cache_tx.events)
        const [, blind_auction_hash] = cache_tx.events.find(event => event.event === 'Added').args
        await snek._bind('blind_auction', blind_auction_hash)
        want(await snek.types('blind_auction')).to.eql(blind_auction_hash)

        const test_beneficiary = ethers.Wallet.createRandom().address
        const blind_auction_args = ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [test_beneficiary, 10000, 20000])
        
        // Currently Failing
        const make = await send(snek.make, 'blind_auction', 'auction_1', blind_auction_args, { gasLimit: gas_limit })
        console.log(make.events)
        const ba_address = `0x` + make.events[0].topics[1].slice(26)
        const blind_auction = new ethers.Contract(ba_address, blind_auction_contract.abi, signer)
        //console.log(await blind_auction.beneficiary())
        //want(await blind_auction.beneficiary()).to.eql(test_beneficiary)

    })

    after(() => {
        fs.rmSync(dir, {recursive: true, force: true})
    })
})