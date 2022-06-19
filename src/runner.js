const { resolve } = require('path')
const dpack = require('@etherpacks/dpack')
const chalk = require('chalk')
const ethers = require('ethers')
const ganache = require("ganache")
const { send } = require('minihat')
module.exports = runner = {}

runner.run = async (output_dir) => {
    const options = { logging: { quiet: "true"}}
    const provider = new ethers.providers.Web3Provider(ganache.provider(options))
    const signer = provider.getSigner()
    const multifab_pack = require('../lib/multifab/pack/multifab_full_hardhat.dpack.json')
    const dapp = await dpack.load(multifab_pack, ethers, signer)
    const multifab = await dapp._types.Multifab.deploy()
    const src_output = require(resolve(`${output_dir}/SrcOutput.json`))
    const tst_output = require(resolve(`${output_dir}/TestOutput.json`))
    const src_contracts = Object.values(src_output.contracts).map((obj) => Object.entries(obj)[0])
    const tst_contracts = Object.values(tst_output.contracts).map((obj) => Object.entries(obj)[0])

    // Deploy Snek (should we just do this via multifab?)
    const snek_output = require(resolve(`${output_dir}/SnekOutput.json`))
    const snek_contract = Object.values(snek_output.contracts)[0]['snek']
    const snek_interface = new ethers.utils.Interface(snek_contract.abi)
    const snek_factory = new ethers.ContractFactory(snek_interface, snek_contract.evm.bytecode.object, signer)
    const snek = await snek_factory.deploy(multifab.address)

    for ([contract_name, contract] of src_contracts) {
        const cache_tx = await send(multifab.cache, contract.evm.bytecode.object);
        [,codehash] = cache_tx.events.find(event => event.event === 'Added').args
        await send(snek.bind, contract_name, codehash)
    }

    for ([contract_name, contract] of tst_contracts) {
        const iface = new ethers.utils.Interface(contract.abi)
        const factory = new ethers.ContractFactory(iface, contract.evm.bytecode.object, signer)
        const test = await factory.deploy(snek.address)
        for (const func of contract.abi) {
            if ('name' in func && func.name.startsWith('test')) {
                try {
                    await send(test[func.name])
                    console.log(`${contract_name}::${func.name} ${chalk.green('PASSED')}`)
                } catch (e) {
                    console.log(`${contract_name}::${func.name} ${chalk.red('FAILED')}`,)
                    console.error(e)
                }
            }
        }
    }
}
